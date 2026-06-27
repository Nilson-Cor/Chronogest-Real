import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import {
  LucideAngularModule,
  // Navegación y layout
  House, Calendar, LayoutDashboard, Building2, Users, Settings, RefreshCw,
  Bell, Sun, Moon, User, Image, Key, LogOut,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  ArrowRight, ArrowLeft,
  // Acciones generales
  Star, Check, X, GraduationCap, Shield, ShieldCheck,
  Lock, Eye, EyeOff, Mail, Sparkles,
  Pencil, Trash2, Search, CheckCircle, XCircle,
  Clock, BookOpen, Send, Database, CalendarPlus, UserCog, HelpCircle, Play, Square, Hourglass,
  // Iconos de solicitudes
  Inbox, List, MessageSquare, MessageCircle, Paperclip, Download, ZoomIn, Ban,
  Building, GitBranch, FileText, ClipboardList,
  // Horarios
  Sunrise, Loader, Info,
  // Otros
  SlidersHorizontal, PlusCircle, MinusCircle, RotateCcw,
  MapPin, Phone, Upload, ExternalLink,
  Save, Edit, Archive, MoreHorizontal, MoreVertical,
  AlertCircle, AlertTriangle,
  UserPlus, UserMinus, UserCheck,
  CalendarCheck, CalendarX,
  Zap, Activity, TrendingUp,
  Wifi, WifiOff, RefreshCcw,
  FileCheck, FilePlus, FileX,
  Layers, Link, Unlink,
  ShieldAlert, ShieldOff,
  Maximize2, Minimize2, Focus,
  Navigation,
  Mic, Coffee,
  Plus, ClipboardCheck, Umbrella,
  Copy, Clipboard,
  // Programador de Fichas
  LayoutList, MousePointer, Hand,
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tenantInterceptor, authInterceptor])),
    importProvidersFrom(LucideAngularModule.pick({
      // Navegación y layout
      House, Calendar, LayoutDashboard, Building2, Users, Settings, RefreshCw,
      Bell, Sun, Moon, User, Image, Key, LogOut,
      ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
      ArrowRight, ArrowLeft,
      // Acciones generales
      Star, Check, X, GraduationCap, Shield, ShieldCheck,
      Lock, Eye, EyeOff, Mail, Sparkles,
      Pencil, Trash2, Search, CheckCircle, XCircle,
      Clock, BookOpen, Send, Database, CalendarPlus, UserCog, HelpCircle, Play, Square, Hourglass,
      // Iconos de solicitudes
      Inbox, List, MessageSquare, MessageCircle, Paperclip, Download, ZoomIn, Ban,
      Building, GitBranch, FileText, ClipboardList,
      // Horarios
      Sunrise, Loader, Info,
      // Otros
      SlidersHorizontal, PlusCircle, MinusCircle, RotateCcw,
      MapPin, Phone, Upload, ExternalLink,
      Save, Edit, Archive, MoreHorizontal, MoreVertical,
      AlertCircle, AlertTriangle,
      UserPlus, UserMinus, UserCheck,
      CalendarCheck, CalendarX,
      Zap, Activity, TrendingUp,
      Wifi, WifiOff, RefreshCcw,
      FileCheck, FilePlus, FileX,
      Layers, Link, Unlink,
      ShieldAlert, ShieldOff,
      Maximize2, Minimize2, Focus,
      Navigation,
      Mic, Coffee,
      Plus, ClipboardCheck, Umbrella,
      Copy, Clipboard,
      // Programador de Fichas
      LayoutList, MousePointer, Hand,
    })),
  ],
};
