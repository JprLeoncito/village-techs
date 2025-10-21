import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

// Professional vector icons for the residence app
export const Icons = {
  // Navigation and Actions
  home: 'home',
  dashboard: 'dashboard',
  menu: 'menu',
  more: 'more-horiz',
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  save: 'save',
  cancel: 'close',
  back: 'arrow-back',
  forward: 'arrow-forward',

  // Vehicle and Transportation
  car: 'directions-car',
  vehicle: 'directions-car',
  motorcycle: 'motorcycle',
  bicycle: 'directions-bike',

  // People and Household
  people: 'people',
  person: 'person',
  users: 'people-outline',
  family: 'family-restroom',
  guest: 'person-add',
  member: 'person-outline',
  household: 'home',

  // Security and Access
  lock: 'lock',
  unlock: 'lock-open',
  key: 'vpn-key',
  security: 'security',
  shield: 'security',
  gate: 'meeting-room',
  access: 'qr-code-scanner',

  // Communication
  phone: 'phone',
  email: 'email',
  message: 'message',
  notification: 'notifications',
  announcement: 'campaign',

  // Financial
  money: 'attach-money',
  payment: 'payment',
  wallet: 'account-balance-wallet',
  card: 'credit-card',

  // Time and Schedule
  time: 'schedule',
  calendar: 'calendar-today',
  clock: 'access-time',
  timer: 'timer',
  history: 'history',

  // Status and States
  pending: 'schedule',
  approved: 'check-circle',
  rejected: 'cancel',
  completed: 'check-circle',
  cancelled: 'block',
  active: 'check-circle',
  inactive: 'block',

  // Documents and Files
  document: 'description',
  file: 'insert-drive-file',
  folder: 'folder',
  upload: 'cloud-upload',
  download: 'cloud-download',

  // Construction and Maintenance
  construction: 'construction',
  build: 'build',
  hammer: 'handyman',
  tools: 'handyman',

  // Packages and Deliveries
  package: 'local-shipping',
  delivery: 'local-mall',
  box: 'inventory-2',

  // Information
  info: 'info',
  help: 'help',
  warning: 'warning',
  error: 'error',
  success: 'check-circle',

  // Miscellaneous
  refresh: 'refresh',
  search: 'search',
  filter: 'filter-list',
  settings: 'settings',
  logout: 'logout',

  // Status Icons with Color Context
  status: {
    pending: 'schedule',
    approved: 'check-circle',
    rejected: 'cancel',
    completed: 'check-circle',
    cancelled: 'block',
    scheduled: 'event',
    checkedIn: 'login',
    checkedOut: 'logout',
  },

  // Feature Icons
  features: {
    stickers: 'local-parking',
    guests: 'people',
    gatePass: 'qr-code',
    household: 'home',
    fees: 'attach-money',
    announcements: 'campaign',
    deliveries: 'local-shipping',
    permits: 'assignment',
    settings: 'settings',
  }
};

// Icon sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 48,
};

// Icon colors
export const IconColors = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
  text: '#1f2937',
  white: '#ffffff',
};