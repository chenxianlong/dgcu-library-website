/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    admin: import('./lib/server/auth').AdminUser | null;
    csrfToken: string;
  }
}
