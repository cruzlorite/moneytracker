// Spending types: a fixed catalogue, grouped, each with a pixel icon. Pure data, no DOM.
// Icons: Pixelarticons by Gerrit Halfmann (MIT, https://github.com/halfmage/pixelarticons), the plane from the
// HackerNoon Pixel Icon Library (MIT, https://github.com/hackernoon/pixel-icon-library); cutlery and fuel pump drawn for MoneyTracker.
// All on a 24×24 grid, filled with currentColor.
import { t } from './i18n.js';

export const GROUPS = {
  comida: 'Comida',
  casa: 'Casa',
  transporte: 'Transporte',
  salud: 'Salud y cuidado',
  ocio: 'Ocio',
  compras: 'Compras',
  personas: 'Personas',
  dinero: 'Dinero',
  tuyos: 'Tuyos',
};

export const CATS = [
  { id: 'super', name: 'Supermercado', short: 'Súper', group: 'comida', d: 'M2 2h2v2H2zm2 6h2v4H4zm2 4h2v4H6zm2 4h10v2H8zm10-4h2v4h-2zm2-4h2v4h-2zM4 6h18v2H4zm0-4h2v4H4zm2 17h3v3H6zm11 0h3v3h-3z' },
  { id: 'restaurante', name: 'Restaurantes', short: 'Restaurante', group: 'comida', d: 'M2 2h2v2H2zM6 2h2v2H6zM10 2h2v2H10zM18 2h4v2H18zM2 4h2v2H2zM6 4h2v2H6zM10 4h2v2H10zM16 4h6v2H16zM2 6h2v2H2zM6 6h2v2H6zM10 6h2v2H10zM16 6h6v2H16zM2 8h10v2H2zM16 8h6v2H16zM4 10h6v2H4zM16 10h6v2H16zM6 12h2v2H6zM16 12h6v2H16zM6 14h2v2H6zM18 14h4v2H18zM6 16h2v2H6zM18 16h4v2H18zM6 18h2v2H6zM18 18h4v2H18zM6 20h2v2H6zM18 20h4v2H18z' },
  { id: 'cafe', name: 'Cafés', short: 'Café', group: 'comida', d: 'M4 4h16v2H4zm0 2h2v8H4zm2 8h10v2H6zm14-8h2v4h-2zm-2 4h2v2h-2zm-2-4h2v8h-2zM2 18h18v2H2z' },
  { id: 'copas', name: 'Bares y copas', short: 'Copas', group: 'comida', d: 'M9 1h6v2H9zm0 2h2v4H9zm4 0h2v4h-2zM7 7h2v2H7zm8 0h2v2h-2zm2 2h2v12h-2zM5 9h2v12H5zm2 12h10v2H7z' },
  { id: 'domicilio', name: 'Comida a domicilio', short: 'A domicilio', group: 'comida', d: 'M10 20h4v2h-4zm0-16h4V2h-4zm0 6h4v2h-4zm4 8h4v2h-4zm0-12h4V4h-4zm0 2h4v2h-4zm4 8h4v2h-4zm0-8h4V6h-4zM6 18h4v2H6zM6 6h4V4H6zm0 2h4v2H6zm-4 8h4v2H2zm0-8h4V6H2zM2 6h2v12H2zm18 0h2v12h-2zm-8 6h2v8h-2zm-2-6h4v2h-4z' },
  { id: 'alquiler', name: 'Alquiler o hipoteca', short: 'Alquiler', group: 'casa', d: 'M4 20h16v2H4zm16-10h2v10h-2zM2 10h2v10H2zm2-2h2v2H4zm2-2h2v2H6zm2-2h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zM8 14h2v6H8zm2-2h4v2h-4zm4 2h2v6h-2z' },
  { id: 'suministros', name: 'Luz, agua y gas', short: 'Luz y agua', group: 'casa', d: 'M4 13h8v6h2v2h-2v2h-2v-8H2v-4h2v2Zm12 6h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2v-2h2v2Zm-6-6h8v4h-2v-2h-8V5h-2V3h2V1h2v8Zm-8 2H4V9h2v2Zm2-2H6V7h2v2Zm2-2H8V5h2v2Z' },
  { id: 'internet', name: 'Internet y móvil', short: 'Internet', group: 'casa', d: 'M11 19h2v2h-2zm-4-3h2v2H7zm8 0h2v2h-2zm-6-2h6v2H9zm-5-1h2v2H4zm2-2h2v2H6zm2-2h8v2H8zm-7 1h2v2H1zm20 0h2v2h-2zM3 8h2v2H3zm2-2h2v2H5zm2-2h10v2H7zm12 4h2v2h-2zm-2-2h2v2h-2zm1 7h2v2h-2zm-2-2h2v2h-2z' },
  { id: 'hogar', name: 'Muebles y hogar', short: 'Hogar', group: 'casa', d: 'M5 3h14v2H5zM3 5h2v3H3zM1 8h6v2H1zm0 2h2v7H1zm2 7h18v2H3zm18-7h2v7h-2zm-4-2h6v2h-6zm0 2h2v2h-2zM7 12h10v2H7zm-2-2h2v2H5zm6-5h2v7h-2zm8 0h2v3h-2zm0 14h2v2h-2zM3 19h2v2H3z' },
  { id: 'limpieza', name: 'Limpieza', short: 'Limpieza', group: 'casa', d: 'M4 9h6v2H4zm2-2h2v2H6zm-4 4h2v10H2zm2 8h6v2H4zm6-8h2v10h-2zm2-4h2v2h-2zm2-2h2v2h-2zm0 6h2V9h-2zm2-8h2v2h-2zm0 10h2v-2h-2zm2-12h2v2h-2zm0 14h2v-2h-2zm-2-8h2v2h-2zm2-2h2v2h-2zm0 4h2v2h-2z' },
  { id: 'reparaciones', name: 'Reparaciones', short: 'Arreglos', group: 'casa', d: 'M9 22H7v-2h2v2Zm12-6h2v6h-6v-6h2v-6h2v6Zm-2 2v2h2v-2h-2ZM7 20H5v-8h2v8Zm4 0H9v-8h2v8Zm-6-8H3v-2h2v2Zm8 0h-2v-2h2v2ZM3 10H1V4h2v6Zm12 0h-2V4h2v6Zm4 0h-2V4h2v6Zm4 0h-2V4h2v6ZM7 6h2V2h4v2h-2v4H5V4H3V2h4v4Zm14-2h-2V2h2v2Z' },
  { id: 'plantas', name: 'Plantas y jardín', short: 'Plantas', group: 'casa', d: 'M1 18h2v4H1zm2-2h2v2H3zm2-2h6v2H5zm6-2h2v2h-2zm-6 6h4v2H5zm4 2h4v2H9zm4-2h4v2h-4zm4-2h2v2h-2zm2-8h2v8h-2zm0-4h2v4h-2zm-2-2h2v2h-2zm-4 2h4v2h-4zM7 6h6v2H7zM5 8h2v2H5zm-2 2h2v4H3z' },
  { id: 'transporte', name: 'Transporte público', short: 'Transporte', group: 'transporte', d: 'M4 15h6v2H4zm10 0h6v2h-6zM4 19h6v2H4zm10 0h6v2h-6zM0 7h2v10H0zm2-2h18v2H2zm20 4h2v8h-2zM2 11h20v2H2zm2 6h2v2H4zm4 0h8v2H8zm-6 0h2v2H2zm16 0h4v2h-4zm2-10h2v2h-2zm-6 0h2v4h-2zM7 7h2v4H7z' },
  { id: 'coche', name: 'Coche', short: 'Coche', group: 'transporte', d: 'M4 13h6v2H4zm10 0h6v2h-6zM4 17h6v2H4zm10 0h6v2h-6zM2 15h4v2H2zm6 0h8v2H8zm10 0h4v2h-4zm4-4h2v4h-2zm-6-4h2v2h-2zM4 5h12v2H4zm-4 6h2v4H0zm12-2h10v2H12zM2 7h2v4H2zm8 0h2v2h-2z' },
  { id: 'gasolina', name: 'Gasolina', short: 'Gasolina', group: 'transporte', d: 'M2 2h12v2H2zM2 4h2v2H2zM12 4h2v2H12zM16 4h2v2H16zM2 6h2v2H2zM12 6h2v2H12zM18 6h2v2H18zM2 8h12v2H2zM18 8h2v2H18zM2 10h2v2H2zM12 10h2v2H12zM18 10h2v2H18zM2 12h2v2H2zM12 12h2v2H12zM18 12h2v2H18zM2 14h2v2H2zM12 14h2v2H12zM16 14h4v2H16zM2 16h2v2H2zM12 16h2v2H12zM16 16h2v2H16zM2 18h2v2H2zM12 18h2v2H12zM0 20h16v2H0z' },
  { id: 'parking', name: 'Parking y peajes', short: 'Parking', group: 'transporte', d: 'M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM8 6h2v12H8zm2 0h4v2h-4zm4 2h2v4h-2zm-4 4h4v2h-4z' },
  { id: 'viajes', name: 'Viajes', short: 'Viajes', group: 'transporte', d: 'm22,11v-1h-7v-1h-1v-2h-1v-1h-1v-2h-1v-1h-1v-1h-3v3h1v3h1v2h-4v-1h-1v-1h-1v-1H1v3h1v4h-1v3h2v-1h1v-1h1v-1h4v2h-1v3h-1v3h3v-1h1v-1h1v-2h1v-1h1v-2h1v-1h7v-1h1v-2h-1Zm-8,2v1h-1v2h-1v1h-1v2h-1v1h-1v1h-1v-1h1v-3h1v-4h-6v1h-1v-4h1v1h6v-4h-1v-3h-1v-1h1v1h1v1h1v2h1v1h1v2h1v1h7v2h-7Z' },
  { id: 'alojamiento', name: 'Alojamiento', short: 'Hotel', group: 'transporte', d: 'M2 16h10V8h10v2h-8v6h8v-6h2v10h-2v-2H2v2H0V4h2v12Zm7-1H5v-2h4v2Zm-4-2H3V9h2v4Zm6 0H9V9h2v4ZM9 9H5V7h4v2Z' },
  { id: 'medico', name: 'Médico', short: 'Médico', group: 'salud', d: 'M14 22h-4v-2h4v2Zm-4-2H8v-4H4v-2h6v6Zm10-4h-4v4h-2v-6h6v2ZM4 14H2v-4h2v4Zm18 0h-2v-4h2v4Zm-12-4H4V8h4V4h2v6Zm6-2h4v2h-6V4h2v4Zm-2-4h-4V2h4v2Z' },
  { id: 'farmacia', name: 'Farmacia', short: 'Farmacia', group: 'salud', d: 'M8 6h8v2H8zm0-4h8v2H8zm0 6h2v2H8zm6 0h2v2h-2zM6 20h12v2H6zm-2-8h2v8H4zm14 0h2v8h-2zM6 10h2v2H6zm10 0h2v2h-2zM6 4h2v2H6zm10 0h2v2h-2z' },
  { id: 'deporte', name: 'Deporte', short: 'Deporte', group: 'salud', d: 'M10 2h4v4h-4zM7 7h10v2H7zm2 2h2v7H9zm4 0h2v7h-2zm-4 7h2v6H9zm4 0h2v6h-2zm-2-2h2v2h-2zM5 5h2v2H5zM3 3h2v2H3zm14 2h2v2h-2zm2-2h2v2h-2z' },
  { id: 'belleza', name: 'Peluquería y belleza', short: 'Peluquería', group: 'salud', d: 'M5 2h4v2H5zm0 12h4v2H5zm0-6h4v2H5zm0 12h4v2H5zM3 4h2v4H3zm0 12h2v4H3zM9 4h2v4H9zm0 12h2v4H9zm0-8h2v2H9zm2 2h2v2h-2zm-2 4h2v2H9zm2-2h2v2h-2zm2-2h2v2h-2zm2 4h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zM15 8h2v2h-2zm2-2h2v2h-2zm2-2h2v2h-2z' },
  { id: 'ocio', name: 'Planes y salidas', short: 'Planes', group: 'ocio', d: 'M4 20H6V22H2V18H4V20ZM20 21H18V19H20V21ZM10 20H6V18H10V20ZM6 18H4V14H6V18ZM14 18H10V16H14V18ZM10 16H8V14H10V16ZM16 16H14V12H16V16ZM22 16H20V14H22V16ZM8 14H6V10H8V14ZM20 14H18V12H20V14ZM14 12H12V10H14V12ZM12 10H8V8H12V10ZM20 9H16V7H20V9ZM5 8H3V6H5V8ZM22 7H20V5H22V7ZM12 6H10V4H12V6ZM10 4H8V2H10V4ZM17 4H15V2H17V4Z' },
  { id: 'cine', name: 'Cine y espectáculos', short: 'Cine', group: 'ocio', d: 'M4 3h16v2H4zm0 6h16v2H4zM2 5h2v14H2zm18 0h2v14h-2zM4 19h16v2H4zM18 7h-2v2h2zm-8 0H8v2h2zm6-2h-2v2h2zM8 5H6v2h2z' },
  { id: 'suscripciones', name: 'Suscripciones', short: 'Suscripción', group: 'ocio', d: 'M4 3h16v2H4zM2 5h2v10H2zm2 10h16v2H4zM20 5h2v10h-2zM6 19h12v2H6zm3-2h2v2H9zm4 0h2v2h-2z' },
  { id: 'juegos', name: 'Juegos', short: 'Juegos', group: 'ocio', d: 'M4 4h16v2H4zm0 14h16v2H4zM2 6h2v12H2zm18 0h2v12h-2zM8 9h2v6H8zM6 11h6v2H6zm8-2h2v2h-2zm2 4h2v2h-2z' },
  { id: 'musica', name: 'Música', short: 'Música', group: 'ocio', d: 'M14 13h7v2h-7zm2 6h3v2h-3zM14 13h2v8h-2zm5-6h2v12h-2zM3 13h7v2H3zm2 6h3v2H5zM3 7h2v12H3zm5 6h2v8H8zM7 3h10v2H7zM5 5h2v2H5zm12 0h2v2h-2z' },
  { id: 'libros', name: 'Libros', short: 'Libros', group: 'ocio', d: 'M2 3h9v2H2zM0 19h11v2H0zM13 3h9v2h-9zm0 16h11v2H13zM11 5h2v18h-2zM0 5h2v14H0zm22 0h2v14h-2zm-7 2h5v2h-5zm0 4h5v2h-5zm0 4h2v2h-2z' },
  { id: 'tabaco', name: 'Tabaco y vapeo', short: 'Tabaco', group: 'ocio', d: 'M2 14h20v2H2zm0 4h20v2H2zm0-2h2v2H2zm18 0h2v2h-2zm-4 0h2v2h-2zM4 10h2v2H4zm2-2h2v2H6zM4 6h2v2H4zm2-2h2v2H6z' },
  { id: 'ropa', name: 'Ropa y calzado', short: 'Ropa', group: 'compras', d: 'M4 3h6v2H4zM2 3h2v8H2zm2 6h4v2H4zM6 9h2v10H6zm2 10h8v2H8zm8-10h2v10h-2zM16 9h4v2h-4zm4-6h2v8h-2zm-6 0h6v2h-6zm-4 2h4v2h-4z' },
  { id: 'compras', name: 'Compras', short: 'Compras', group: 'compras', d: 'M3 6h18v2H3zm2 14h14v2H5zM3 8h2v12H3zm16 0h2v12h-2zM7 4h2v6H7zm2-2h6v2H9zm6 2h2v6h-2z' },
  { id: 'tecnologia', name: 'Tecnología', short: 'Tecnología', group: 'compras', d: 'M3 18h18v-2h2v4H1v-4h2v2Zm2-4h14V6h2v10H3V6h2v8Zm14-8H5V4h14v2Z' },
  { id: 'caprichos', name: 'Caprichos', short: 'Caprichos', group: 'compras', d: 'M11 2h2v6h-2zm0 14h2v6h-2zM2 11h6v2H2zm14 0h6v2h-6zm-6-2h4v6h-4zm-1 1h6v4H9zm10-7h2v2h-2zM3 19h2v2H3z' },
  { id: 'regalos', name: 'Regalos', short: 'Regalos', group: 'compras', d: 'M4 6h16v2H4zM2 8h2v4H2zm2 4h16v2H4zm16-4h2v4h-2zM6 4h2v2H6zm2-2h3v2H8zm3 2h2v2h-2zm2-2h3v2h-3zm3 2h2v2h-2zM4 14h2v6H4zm2 6h12v2H6zm12-6h2v6h-2zm-7-6h2v4h-2zm0 6h2v6h-2z' },
  { id: 'familia', name: 'Familia e hijos', short: 'Familia', group: 'personas', d: 'M5 2h6v2H5zm10 0h4v2h-4zM5 10h6v2H5zm10 0h4v2h-4zm4-6h2v6h-2zm-8 0h2v6h-2zM3 4h2v6H3zM0 18h2v4H0zm14 0h2v4h-2zm8 0h2v4h-2zM4 14h8v2H4zm12 0h4v2h-4zM2 16h2v2H2zm10 0h2v2h-2zm8 0h2v2h-2z' },
  { id: 'mascotas', name: 'Mascotas', short: 'Mascotas', group: 'personas', d: 'M14 22H10V20H14V22ZM16 20H14V18H10V20H8V18H5V16H11V14H13V16H19V18H16V20ZM3 10H5V16H3V12H1V6H3V10ZM23 12H21V16H19V10H21V6H23V12ZM11 12H9V8H11V12ZM15 12H13V8H15V12ZM7 10H5V6H7V10ZM19 10H17V6H19V10ZM5 6H3V4H5V6ZM19 4H17V6H15V4H9V6H7V4H5V2H19V4ZM21 6H19V4H21V6Z' },
  { id: 'formacion', name: 'Formación', short: 'Formación', group: 'personas', d: 'M3 2h4v4H3zM2 8h12v2H2zm7-4h11v2H9zm1 10h10v2H10zM2 9h6v7H2zm0 7h2v4H2zm4 0h2v4H6zM20 6h2v8h-2z' },
  { id: 'donaciones', name: 'Donaciones', short: 'Donación', group: 'personas', d: 'M13 22h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 16H5v-2h2v2Zm12 0h-2v-2h2v2ZM5 14H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 12H1V6h2v6Zm20 0h-2V6h2v6ZM13 8h-2V6h2v2ZM5 6H3V4h2v2Zm6 0H9V4h2v2Zm4 0h-2V4h2v2Zm6 0h-2V4h2v2ZM9 4H5V2h4v2Zm10 0h-4V2h4v2Z' },
  { id: 'seguros', name: 'Seguros', short: 'Seguros', group: 'dinero', d: 'M4 2h16v2H4zM2 4h2v10H2zm18 0h2v10h-2zM4 14h2v2H4zm2 2h2v2H6zm4 4h4v2h-4zm10-6h-2v2h2zm-2 2h-2v2h2zm-2 2h-2v2h2zm-6 0H8v2h2z' },
  { id: 'impuestos', name: 'Impuestos y tasas', short: 'Impuestos', group: 'dinero', d: 'M3 2h2v18H3zm16 0h2v18h-2zM5 4h2v2H5zm4 0h2v2H9zM5 20h14v2H5zm8-16h2v2h-2zM7 2h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zm2 2h2v2h-2zM7 8h10v2H7zm0 4h10v2H7zm0 4h4v2H7z' },
  { id: 'comisiones', name: 'Comisiones', short: 'Comisiones', group: 'dinero', d: 'M6 20H4v-2h2v2Zm12 0h-4v-2h4v2ZM8 18H6v-2h2v2Zm6 0h-2v-4h2v4Zm6 0h-2v-4h2v4Zm-10-2H8v-2h2v2Zm2-2h-2v-2h2v2Zm6 0h-4v-2h4v2Zm-8-2H6v-2h4v2Zm4 0h-2v-2h2v2Zm-8-2H4V6h2v4Zm6 0h-2V6h2v4Zm4 0h-2V8h2v2Zm2-2h-2V6h2v2Zm-8-2H6V4h4v2Zm10 0h-2V4h2v2Z' },
  // not spending: money moved from your account to savings or investments (it leaves the account, it's saved)
  { id: 'ahorro', name: 'Ahorro e inversión', short: 'Ahorro', group: 'dinero', d: 'M6 7h12v2H6zM4 9h2v10H4zm14 0h2v10h-2zM6 19h12v2H6zm5-16h2v4h-2zm-3 9h8v2H8zm3-2h2v6h-2z' },
  { id: 'efectivo', name: 'Efectivo', short: 'Efectivo', group: 'dinero', d: 'M3 5h18v2H3zM1 7h2v10H1zm2 10h18v2H3zM21 7h2v10h-2zM11 9h2v2h-2zm-2 2h2v2H9zm2 2h2v2h-2zm2-2h2v2h-2zm4 0h2v2h-2zM5 11h2v2H5z' },
  { id: 'otros', name: 'Otros', short: 'Otros', group: 'dinero', d: 'M14 4h4v2h-4zm-4-2h4v2h-4zM6 8h4v2H6zm0 10h4v2H6zm4-8h4v2h-4zm0 10h4v2h-4zm4-12h4v2h-4zm0 10h4v2h-4zM6 4h4v2H6zM2 6h4v2H2zm0 10h4v2H2zM18 6h4v2h-4zm0 10h4v2h-4zM2 6h2v12H2zm18 0h2v12h-2zm-8 6h2v8h-2z' },
];
// names in the chosen language (your own types keep the name you gave them)
for (const k of Object.keys(GROUPS)) GROUPS[k] = t(GROUPS[k]);
for (const c of CATS) { c.name = t(c.name); c.short = t(c.short); }
export const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
/** The built-in types: their icons are the ones you can give your own types. */
export const BASE = CATS.slice();

/**
 * Your own types, from the settings: [{ id: 'c-…', name, icon (id of the built-in type whose icon it uses) }].
 * They join CATS and CAT in the group "tuyos"; calling it again replaces them.
 */
export function setCustomCats(list = []) {
  for (let i = CATS.length - 1; i >= 0; i--) if (CATS[i].group === 'tuyos') { delete CAT[CATS[i].id]; CATS.splice(i, 1); }
  for (const c of list) {
    const base = CAT[c.icon] || CAT.otros;
    const x = { id: c.id, name: c.name, short: c.name, group: 'tuyos', d: base.d, icon: base.id };
    CATS.push(x); CAT[c.id] = x;
  }
}
export const isCustomCat = (id) => /^c-/.test(String(id || ''));

/** What new users see before they have budgets or habits of their own. */
/** The type for money moved to savings or investments: it leaves the account but it isn't spending. */
export const SAVE_CAT = 'ahorro';
export const STARTERS = ['super', 'restaurante', 'cafe', 'copas', 'transporte', 'ocio', 'compras', 'ropa'];

// Guess a type from a name ("Seguro del coche" → seguros). First match wins, so the more specific rules go first.
const RULES = [
  ['seguros', 'seguro insurance'],
  ['impuestos', 'impuesto ibi hacienda irpf tasa multa tax council fine'],
  ['suscripciones', 'netflix spotify hbo disney prime suscrip youtube icloud gcp chatgpt patreon subscription netflix'],
  ['gasolina', 'gasolina combustible diesel repsol cepsa fuel petrol'],
  ['suministros', 'luz agua gas electric endesa iberdrola naturgy suministro calefacc electricity water utilities energy heating'],
  ['internet', 'internet movil fibra telefon digi vodafone movistar orange phone mobile broadband wifi'],
  ['alquiler', 'alquiler hipoteca comunidad rent mortgage'],
  ['super', 'super mercadona carrefour lidl aldi alcampo eroski fruteria grocer supermarket tesco sainsbury asda'],
  ['restaurante', 'restaurante cena sushi pizza burger restaurant dinner lunch takeaway'],
  ['cafe', 'cafe desayuno coffee breakfast'],
  ['belleza', 'peluqueria barberia belleza estetica hair barber beauty nails'],
  ['copas', 'bar copas canas cerveza vino pub drinks beer wine'],
  ['domicilio', 'glovo eats domicilio delivery deliveroo'],
  ['parking', 'parking peaje aparcamiento toll'],
  ['coche', 'coche itv taller car mot garage'],
  ['transporte', 'transporte metro bus renfe tren abono taxi cabify uber bici train subway tube taxi travelcard'],
  ['alojamiento', 'hotel airbnb alojamiento hostel'],
  ['viajes', 'viaje vacaciones vuelo avion ryanair trip holiday flight travel'],
  ['farmacia', 'farmacia pharmacy chemist'],
  ['medico', 'medico dentista clinica salud fisio psicolog optica doctor dentist clinic health physio optician'],
  ['deporte', 'gimnasio gym deporte padel piscina yoga crossfit sport swim'],
  ['cine', 'cine teatro concierto entradas cinema theatre theater concert tickets'],
  ['juegos', 'juego steam playstation xbox nintendo game'],
  ['musica', 'musica music'],
  ['libros', 'libro kindle book'],
  ['ropa', 'ropa zapat calzado zara clothes shoes'],
  ['tecnologia', 'tecnologia ordenador portatil tech computer laptop phone'],
  ['caprichos', 'capricho antojo chuche dulce treat snack sweets'],
  ['compras', 'amazon compras shopping'],
  ['regalos', 'regalo cumple navidad gift present birthday christmas'],
  ['mascotas', 'mascota veterinari perro gato pienso pet vet dog cat'],
  ['familia', 'familia hijo nino guarderia family kids child nursery'],
  ['formacion', 'curso formacion academia universidad master matricula colegio idiomas course training university tuition school'],
  ['donaciones', 'donacion ong donation charity'],
  ['hogar', 'mueble ikea hogar furniture home'],
  ['limpieza', 'limpieza cleaning cleaner'],
  ['reparaciones', 'reparacion fontaner arreglo repair plumber'],
  ['plantas', 'planta jardin plant garden'],
  ['ahorro', 'ahorro inversion invertir fondo indexado broker traspaso aportacion saving invest fund isa pension'],
  ['comisiones', 'comision banco fee bank'],
  ['efectivo', 'efectivo cajero cash atm'],
  ['tabaco', 'tabaco cigarr estanco vaper vapeo tobacco cigarette vape'],
  ['ocio', 'ocio salida plan leisure outing'],
].map(([id, words]) => [id, words.split(' ')]);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function guessCat(name) {
  const n = norm(name);
  for (const c of CATS) if (c.group === 'tuyos' && norm(c.name) && n.includes(norm(c.name))) return c.id; // your own types first
  const words = n.split(/[^a-z0-9]+/).filter(Boolean);
  for (const [id, keys] of RULES) if (keys.some((k) => words.some((w) => w.startsWith(k)))) return id;
  return null;
}
