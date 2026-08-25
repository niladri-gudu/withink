import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

vi.mock("@/config/env", () => ({
  env: {
    IS_PROD: false,
    MONGODB_URI: "mongodb://localhost:27017/test",
    BETTER_AUTH_SECRET: "a".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3000",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    R2_ACCOUNT_ID: "account-id",
    R2_ACCESS_KEY_ID: "access-key-id",
    R2_SECRET_ACCESS_KEY: "secret-access-key",
    R2_BUCKET_NAME: "bucket-name",
    R2_PUBLIC_URL: "http://localhost:3000/r2",
    RESEND_API_KEY: "resend-api-key",
    EMAIL_FROM: "from@example.com",
    CONTACT_EMAIL: "contact@example.com",
    ENCRYPTION_KEY:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    DODO_API_KEY: "dodo-api-key",
    DODO_WEBHOOK_SECRET: "whsec_test-secret",
    DODO_PRODUCT_PLUS_MONTHLY: "pdt_plus_monthly",
    DODO_PRODUCT_PLUS_YEARLY: "pdt_plus_yearly",
    DODO_PRODUCT_PRO_MONTHLY: "pdt_pro_monthly",
    DODO_PRODUCT_PRO_YEARLY: "pdt_pro_yearly",
    DODO_PRODUCT_PRO_LIFETIME: "pdt_pro_lifetime",
  },
  validateServerEnv: () => {},
}));
