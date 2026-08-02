// Shared types used across the application

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}
