"use client";

import { createAuthClient } from "better-auth/react";

// A relative auth URL keeps OAuth requests on the same origin in previews,
// custom domains, and production deployments.
export const authClient = createAuthClient();
