#!/usr/bin/env python3
"""
Migracion: Base de datos Aprendices SENA Yamboro -> PostgreSQL
Hoja origen : Aprendices2025
BD destino  : epsas_erp

Orden de upsert:
  1. programas   (identificador: nombre)
  2. cursos      (identificador: codigo = ID FICHA)
  3. personas    (identificador: cedula)
  4. matriculas  (identificador: persona + curso)

Uso:
    python3 migrate_aprendices.py                      # ejecucion normal
    python3 migrate_aprendices.py --dry-run            # simula sin escribir en DB
    python3 migrate_aprendices.py --background         # lanza en segundo plano
    python3 migrate_aprendices.py --excel /ruta/a.xlsx # ruta personalizada del Excel
    python3 migrate_aprendices.py --batch 200          # commit cada N filas (default 100)
    python3 migrate_aprendices.py --check              # solo verifica conexion y estructura
"""

import os
import sys

# Forzar UTF-8 en stdout/stderr para evitar UnicodeEncodeError en Windows (cp1252)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import uuid
import logging
import argparse
import subprocess
import warnings
from datetime import datetime, date
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor

warnings.filterwarnings("ignore", category=UserWarning)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN POR DEFECTO  (sobreescribible con variables de entorno o args)
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
DEFAULT_EXCEL = os.environ.get(
    "EXCEL_PATH",
    str(SCRIPT_DIR.parent.parent
        / "uploads"
        / "df82ca81-1ff3-48c3-9e78-f220e545c4ff-1776084957711_Base de datos Aprendices SENA Yamboro.xlsx"),
)
SHEET_NAME = "Aprendices2025"

# Nombres posibles de la columna de avance/porcentaje en el Excel
# (se prueba en orden; se usa el primero que se encuentre)
AVANCE_COLUMN_CANDIDATES = [
    "% EJECUCCION",       # ← nombre real en el Excel
    "% EJECUCION",
    "% EJECUCIÓN",
    "% DE EJECUCION",
    "% DE EJECUCIÓN",
    "PORCENTAJE DE EJECUCIÓN",
    "PORCENTAJE DE EJECUCION",
    "PORCENTAJE EJECUCIÓN",
    "PORCENTAJE EJECUCION",
    "AVANCE",
    "avance",
    "porcentajeEjecucion",
]

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "localhost"),
    "port":     int(os.environ.get("DB_PORT", "5435")),
    "dbname":   os.environ.get("DB_NAME",     "epsas_erp"),
    "user":     os.environ.get("DB_USERNAME", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "epsas2026"),
}

LOG_FILE = SCRIPT_DIR / "migrate_aprendices.log"

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
def setup_logging(silent: bool = False):
    # stdout ya fue reconfigurado a UTF-8 al inicio del script
    handlers = [logging.FileHandler(LOG_FILE, encoding="utf-8")]
    if not silent:
        handlers.append(logging.StreamHandler(sys.stdout))
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
        force=True,
    )

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE TIPO
# ─────────────────────────────────────────────────────────────────────────────
def safe_str(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s.lower() not in ("nan", "none", "") else None


def safe_float(val) -> float | None:
    """Convierte a float; devuelve None si no es un número válido."""
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return None
        f = float(str(val).strip().replace(",", ".").replace("%", ""))
        return round(f, 2)
    except (ValueError, TypeError):
        return None


def normalize_avance(val: float | None) -> float | None:
    """
    Convierte el valor de avance del Excel a la escala 0-100 usada en la BD.

    El Excel almacena el avance como fracción decimal (0 a 1), donde:
        0   = 0 %
        0.5 = 50 %
        1   = 100 %

    Si por algún motivo el valor ya viene en escala 0-100 (> 1),
    se deja sin modificar y se recorta a [0, 100].
    """
    if val is None:
        return None
    if val <= 1.0:
        # Escala fraccionaria → multiplicar por 100
        return round(val * 100, 2)
    # Ya viene en porcentaje → solo recortar
    return round(min(val, 100.0), 2)


def detect_avance_column(df: "pd.DataFrame") -> str | None:
    """Detecta qué columna del Excel contiene el porcentaje de ejecución."""
    cols_lower = {c.strip().lower(): c for c in df.columns}
    for candidate in AVANCE_COLUMN_CANDIDATES:
        if candidate.lower() in cols_lower:
            found = cols_lower[candidate.lower()]
            log.info(f"  ✓ Columna de avance detectada: '{found}'")
            return found
    log.warning(
        "  ⚠  No se encontró columna de avance en el Excel. "
        f"Candidatos probados: {AVANCE_COLUMN_CANDIDATES}. "
        "Se dejará avance = 0 en todas las matrículas."
    )
    return None


def safe_int(val) -> int | None:
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return None
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return None


def parse_date(val) -> date | None:
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    try:
        return pd.to_datetime(str(val)).date()
    except Exception:
        return None


def map_estado(val: str | None) -> str:
    """
    Mapea el estado del Excel al enum tipoEstado de personas (solo activo | inactivo).

    Regla: la tabla personas solo admite 'activo' o 'inactivo'.
    Los estados detallados (certificado, por certificar, cancelado, etc.)
    se migran a la base secundaria del ERP en un proyecto aparte.

      EN FORMACION, INDUCCION, POR CERTIFICAR, CONDICIONADO -> activo
      CERTIFICADO, RETIRO VOLUNTARIO, CANCELADO,
      TRASLADADO, APLAZADO                                   -> inactivo
    """
    if not val:
        return "activo"
    v = val.strip().upper()
    INACTIVOS = {
        "CERTIFICADO", "RETIRO VOLUNTARIO", "CANCELADO",
        "TRASLADADO", "APLAZADO",
    }
    return "inactivo" if v in INACTIVOS else "activo"


def estado_excel_original(val: str | None) -> str | None:
    """Retorna el estado original del Excel en minúsculas para guardarlo
    en la tabla de matrículas como referencia antes de migrar al ERP."""
    if not val:
        return None
    return val.strip().lower()


# ─────────────────────────────────────────────────────────────────────────────
# VERIFICACIÓN DE ESTRUCTURA DE TABLAS
# ─────────────────────────────────────────────────────────────────────────────
def check_db_structure(conn):
    """Verifica que las 4 tablas destino existan y muestra sus columnas."""
    tables = ["programas", "cursos", "personas", "matriculas"]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        for table in tables:
            cur.execute(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
                """,
                (table,),
            )
            cols = cur.fetchall()
            if not cols:
                log.warning(f"  ⚠  Tabla '{table}' NO ENCONTRADA en la BD")
            else:
                log.info(f"  ✓  Tabla '{table}': {[c['column_name'] for c in cols]}")


def discover_pk_columns(conn) -> dict:
    """Devuelve el nombre real de la PK para cada tabla (puede ser camelCase)."""
    pk_map = {}
    tables = ["programas", "cursos", "personas", "matriculas"]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        for table in tables:
            cur.execute(
                """
                SELECT a.attname AS column_name
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid
                    AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass
                  AND i.indisprimary
                """,
                (table,),
            )
            row = cur.fetchone()
            pk_map[table] = row["column_name"] if row else "id"
    return pk_map


# ─────────────────────────────────────────────────────────────────────────────
# UPSERT FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
def upsert_programa(cur, pk_col: str, nombre: str, dry_run: bool, stats: dict) -> str:
    """Inserta o recupera un programa por nombre. Retorna su UUID."""
    cur.execute(
        f'SELECT "{pk_col}" FROM programas WHERE nombre = %s',
        (nombre,),
    )
    row = cur.fetchone()
    if row:
        return str(row[0])

    new_id = str(uuid.uuid4())
    if not dry_run:
        cur.execute(
            f'INSERT INTO programas ("{pk_col}", nombre) VALUES (%s, %s)',
            (new_id, nombre),
        )
    stats["programas_insertados"] += 1
    log.info(f'    [PROGRAMA] Nuevo: "{nombre}"')
    return new_id


def upsert_curso(
    cur, pk_col: str, codigo: str,
    fecha_inicio, fecha_fin, fin_lectiva,
    programa_id: str, dry_run: bool, stats: dict,
) -> str:
    """Upsert de curso por codigo (ID FICHA). Retorna su UUID."""
    cur.execute(
        f'SELECT "{pk_col}", fecha_inicio, fecha_fin, fin_lectiva, programa '
        f'FROM cursos WHERE codigo = %s',
        (codigo,),
    )
    row = cur.fetchone()

    if row:
        cid = str(row[0])
        updates = {}
        if fecha_inicio and row[1] != fecha_inicio:
            updates["fecha_inicio"] = fecha_inicio
        if fecha_fin and row[2] != fecha_fin:
            updates["fecha_fin"] = fecha_fin
        if fin_lectiva and row[3] != fin_lectiva:
            updates["fin_lectiva"] = fin_lectiva
        if str(row[4]) != str(programa_id):
            updates["programa"] = programa_id

        if updates and not dry_run:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f"UPDATE cursos SET {set_clause} WHERE codigo = %s",
                list(updates.values()) + [codigo],
            )
            stats["cursos_actualizados"] += 1
            log.info(f"    [CURSO] Actualizado {codigo}: {list(updates.keys())}")
        return cid

    new_id = str(uuid.uuid4())
    if not dry_run:
        cur.execute(
            f'INSERT INTO cursos ("{pk_col}", codigo, fecha_inicio, fecha_fin, fin_lectiva, programa) '
            f"VALUES (%s, %s, %s, %s, %s, %s)",
            (new_id, codigo, fecha_inicio, fecha_fin, fin_lectiva, programa_id),
        )
    stats["cursos_insertados"] += 1
    log.info(f"    [CURSO] Nuevo: {codigo}")
    return new_id


def upsert_persona(
    cur, pk_col: str, cedula: int,
    nombre: str, apellidos: str, estado: str,
    dry_run: bool, stats: dict,
) -> str:
    """
    Upsert de persona por cédula. Retorna su UUID.

    Reglas:
      - estado  -> solo 'activo' o 'inactivo'  (ver map_estado)
      - cargo   -> siempre 'aprendiz'
      Los estados detallados del Excel se migran al ERP aparte.
    """
    full_name = f"{nombre} {apellidos}".strip() if apellidos else nombre
    estado_db = map_estado(estado)   # solo 'activo' | 'inactivo'
    cargo_db  = "aprendiz"

    cur.execute(
        f'SELECT "{pk_col}", nombre, estado, cargo FROM personas WHERE cedula = %s',
        (cedula,),
    )
    row = cur.fetchone()

    if row:
        pid = str(row[0])
        updates = {}
        if row[1] != full_name:
            updates["nombre"] = full_name
        if row[2] != estado_db:
            updates["estado"] = estado_db
        if row[3] != cargo_db:
            updates["cargo"] = cargo_db

        if updates and not dry_run:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f"UPDATE personas SET {set_clause} WHERE cedula = %s",
                list(updates.values()) + [cedula],
            )
            stats["personas_actualizadas"] += 1
            log.info(f"    [PERSONA] Actualizada {cedula}: {list(updates.keys())}")
        return pid

    new_id = str(uuid.uuid4())
    if not dry_run:
        cur.execute(
            f'INSERT INTO personas ("{pk_col}", nombre, cedula, estado, cargo) '
            f"VALUES (%s, %s, %s, %s, %s)",
            (new_id, full_name, cedula, estado_db, cargo_db),
        )
    stats["personas_insertadas"] += 1
    log.info(f"    [PERSONA] Nueva: {cedula} – {full_name} [{estado_db}]")
    return new_id


def upsert_matricula(
    cur, pk_col: str, persona_id: str, curso_id: str,
    estado_original: str | None, avance: float | None,
    dry_run: bool, stats: dict,
):
    """
    Upsert de matrícula por el par (persona, curso).

    - Si no existe: INSERT con estado y avance.
    - Si ya existe: UPDATE avance (y estado si cambió) para reflejar
      siempre el valor más reciente del Excel.
    """
    avance_val = avance if avance is not None else 0.0

    cur.execute(
        f'SELECT "{pk_col}", estado, avance FROM matriculas '
        f'WHERE persona = %s AND curso = %s',
        (persona_id, curso_id),
    )
    existing = cur.fetchone()

    if existing:
        # Registro ya existe → actualizar avance (y estado si cambió)
        updates = {}
        if float(existing[2] or 0) != avance_val:
            updates["avance"] = avance_val
        if estado_original and existing[1] != estado_original:
            updates["estado"] = estado_original

        if updates and not dry_run:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f'UPDATE matriculas SET {set_clause} '
                f'WHERE persona = %s AND curso = %s',
                list(updates.values()) + [persona_id, curso_id],
            )
            stats["matriculas_actualizadas"] += 1
        return

    # Registro nuevo → INSERT
    new_id = str(uuid.uuid4())
    if not dry_run:
        cur.execute(
            f'INSERT INTO matriculas ("{pk_col}", persona, curso, estado, avance) '
            f'VALUES (%s, %s, %s, %s, %s)',
            (new_id, persona_id, curso_id, estado_original, avance_val),
        )
    stats["matriculas_insertadas"] += 1


# ─────────────────────────────────────────────────────────────────────────────
# PROCESO PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────
def run_migration(excel_path: str, dry_run: bool, batch_size: int):
    setup_logging(silent=False)

    log.info("=" * 65)
    log.info("  INICIO MIGRACIÓN APRENDICES SENA YAMBORO")
    log.info(f"  Modo    : {'DRY-RUN (sin escritura)' if dry_run else 'REAL'}")
    log.info(f"  Excel   : {excel_path}")
    log.info(f"  Hoja    : {SHEET_NAME}")
    log.info(f"  DB      : {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}")
    log.info(f"  Batch   : {batch_size} filas por commit")
    log.info("=" * 65)

    # ── 1. Leer Excel ──────────────────────────────────────────────────────
    log.info("Leyendo Excel…")
    try:
        df = pd.read_excel(excel_path, sheet_name=SHEET_NAME, dtype=str)
    except Exception as e:
        log.error(f"No se pudo leer el Excel: {e}")
        sys.exit(1)

    df = df.where(pd.notna(df), None)
    total = len(df)
    log.info(f"Filas encontradas: {total:,}")

    # Detectar columna de avance/porcentaje de ejecución
    avance_col = detect_avance_column(df)

    # ── 2. Conectar a PostgreSQL ───────────────────────────────────────────
    log.info("Conectando a PostgreSQL…")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        log.info("  ✓ Conexión exitosa")
    except Exception as e:
        log.error(f"Error de conexión: {e}")
        sys.exit(1)

    # ── 3. Verificar estructura y descubrir PKs ───────────────────────────
    log.info("Verificando estructura de tablas…")
    check_db_structure(conn)
    pk_map = discover_pk_columns(conn)
    log.info(f"  PKs detectadas: {pk_map}")

    # ── 4. Recorrer filas ─────────────────────────────────────────────────
    stats = {
        "programas_insertados":   0,
        "cursos_insertados":      0,
        "cursos_actualizados":    0,
        "personas_insertadas":    0,
        "personas_actualizadas":  0,
        "matriculas_insertadas":  0,
        "matriculas_actualizadas": 0,
        "omitidas":               0,
        "errores":                0,
    }

    log.info(f"\nProcesando {total:,} filas…")
    batch_pending = 0

    for idx, row in df.iterrows():
        fila_num = idx + 2   # número de fila en Excel (encabezado = fila 1)
        try:
            # ── Extraer campos ────────────────────────────────────────────
            programa_nombre = safe_str(row.get("PROGRAMA"))
            if not programa_nombre:
                log.debug(f"Fila {fila_num}: PROGRAMA vacío, se omite")
                stats["omitidas"] += 1
                continue

            cedula = safe_int(row.get("Número de Documento"))
            if not cedula:
                log.warning(f"Fila {fila_num}: Número de Documento vacío, se omite")
                stats["omitidas"] += 1
                continue

            id_ficha    = safe_str(row.get("ID FICHA"))
            fecha_ini   = parse_date(row.get("FECHA INICIO"))
            fecha_fin   = parse_date(row.get("FECHA FIN"))
            fecha_lect  = parse_date(row.get("FECHA LECTIVA"))
            nombre      = safe_str(row.get("Nombre")) or ""
            apellidos   = safe_str(row.get("Apellidos")) or ""
            estado      = safe_str(row.get("Estado"))
            avance      = normalize_avance(safe_float(row.get(avance_col))) if avance_col else None

            # ── Upserts dentro de un cursor ───────────────────────────────
            with conn.cursor() as cur:
                # 1) Programa
                prog_id = upsert_programa(
                    cur, pk_map["programas"], programa_nombre, dry_run, stats
                )

                # 2) Curso (sólo si tiene ID FICHA)
                curso_id = None
                if id_ficha:
                    curso_id = upsert_curso(
                        cur, pk_map["cursos"], id_ficha,
                        fecha_ini, fecha_fin, fecha_lect,
                        prog_id, dry_run, stats,
                    )

                # 3) Persona
                persona_id = upsert_persona(
                    cur, pk_map["personas"], cedula,
                    nombre, apellidos, estado, dry_run, stats,
                )

                # 4) Matrícula — guarda el estado original del Excel como referencia.
                #    El procesamiento detallado (certificado, cancelado, etc.)
                #    se migra al ERP aparte en otro proyecto.
                if curso_id:
                    upsert_matricula(
                        cur, pk_map["matriculas"], persona_id, curso_id,
                        estado_excel_original(estado), avance,
                        dry_run, stats,
                    )

            batch_pending += 1

            # Commit por lotes
            if batch_pending >= batch_size:
                if not dry_run:
                    conn.commit()
                batch_pending = 0
                pct = round((idx + 1) / total * 100, 1)
                log.info(
                    f"  Progreso: {idx+1:,}/{total:,} filas ({pct}%) | "
                    f"inserts-> prog:{stats['programas_insertados']} "
                    f"cur:{stats['cursos_insertados']} "
                    f"per:{stats['personas_insertadas']} "
                    f"mat:{stats['matriculas_insertadas']}"
                )

        except Exception as e:
            conn.rollback()
            batch_pending = 0
            stats["errores"] += 1
            log.error(f"Fila {fila_num} (cédula={row.get('Número de Documento')}): {e}")

    # Commit final del lote restante
    if batch_pending > 0 and not dry_run:
        conn.commit()

    conn.close()

    # ── 5. Resumen final ──────────────────────────────────────────────────
    log.info("\n" + "=" * 65)
    log.info("  RESUMEN DE MIGRACIÓN")
    log.info("=" * 65)
    log.info(f"  Total filas procesadas : {total:,}")
    log.info(f"  Programas insertados   : {stats['programas_insertados']:,}")
    log.info(f"  Cursos insertados      : {stats['cursos_insertados']:,}")
    log.info(f"  Cursos actualizados    : {stats['cursos_actualizados']:,}")
    log.info(f"  Personas insertadas    : {stats['personas_insertadas']:,}")
    log.info(f"  Personas actualizadas  : {stats['personas_actualizadas']:,}")
    log.info(f"  Matrículas insertadas  : {stats['matriculas_insertadas']:,}")
    log.info(f"  Matrículas actualizadas: {stats['matriculas_actualizadas']:,}")
    log.info(f"  Filas omitidas         : {stats['omitidas']:,}")
    log.info(f"  Errores                : {stats['errores']:,}")
    if dry_run:
        log.info("  ⚠  DRY-RUN: ningún cambio fue guardado en la BD")
    log.info("=" * 65)
    log.info(f"  Log guardado en: {LOG_FILE}")


# ─────────────────────────────────────────────────────────────────────────────
# VERIFICACIÓN RÁPIDA DE CONEXIÓN
# ─────────────────────────────────────────────────────────────────────────────
def run_check():
    setup_logging()
    log.info("Verificando conexión y estructura de la BD…")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        log.info(f"  ✓ Conexión exitosa a {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}")
        check_db_structure(conn)
        pk_map = discover_pk_columns(conn)
        log.info(f"  PKs detectadas: {pk_map}")
        conn.close()
    except Exception as e:
        log.error(f"  ✗ Error: {e}")
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# LANZAR EN SEGUNDO PLANO
# ─────────────────────────────────────────────────────────────────────────────
def launch_background(args: list):
    """Re-lanza el script sin la flag --background usando nohup."""
    new_args = [a for a in args if a != "--background"]
    cmd = [sys.executable, __file__] + new_args
    log_out = str(LOG_FILE)

    with open(log_out, "a") as fout:
        proc = subprocess.Popen(
            cmd,
            stdout=fout,
            stderr=fout,
            close_fds=True,
            start_new_session=True,
        )
    print(f"✓ Migración lanzada en segundo plano (PID {proc.pid})")
    print(f"  Sigue el progreso con:  tail -f {log_out}")


# ─────────────────────────────────────────────────────────────────────────────
# PUNTO DE ENTRADA
# ─────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Migración de Aprendices SENA Yamboro -> PostgreSQL epsas_erp",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--excel", default=DEFAULT_EXCEL,
        help="Ruta al archivo Excel (default: detectado automáticamente)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Simula la migración sin escribir nada en la BD",
    )
    parser.add_argument(
        "--background", action="store_true",
        help="Ejecuta la migración en segundo plano",
    )
    parser.add_argument(
        "--batch", type=int, default=100,
        help="Número de filas por commit (default: 100)",
    )
    parser.add_argument(
        "--check", action="store_true",
        help="Sólo verifica la conexión y la estructura de tablas",
    )

    args = parser.parse_args()

    if args.background:
        launch_background(sys.argv[1:])
        return

    if args.check:
        run_check()
        return

    run_migration(
        excel_path=args.excel,
        dry_run=args.dry_run,
        batch_size=args.batch,
    )


if __name__ == "__main__":
    main()
