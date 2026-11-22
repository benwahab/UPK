interface Env {
  BETTER_AUTH_SECRET: string;
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_EMAILS?: string;
  RATE_LIMIT_SALT?: string;
  PHOTOS?: R2Bucket;
}

declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string;
    TURNSTILE_SECRET_KEY?: string;
    ADMIN_EMAILS?: string;
    RATE_LIMIT_SALT?: string;
    PHOTOS?: R2Bucket;
  }
}
