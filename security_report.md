# Security Audit Report - Nali Project

## Summary
The application follows several security best practices, such as excluding secrets from version control and protecting major routes with middleware. However, several critical vulnerabilities were identified in the database Row Level Security (RLS) policies and storage configurations that could allow unauthorized data modification or account escalation.

## Identified Vulnerabilities

### 1. Privilege Escalation (Critical)
**Issue**: The `profiles` table lacks explicit RLS policies, or they are too permissive.
**Risk**: A logged-in user could potentially update their own `role` field from 'user' to 'admin' using the Supabase client browser console, granting them full access to administrative tools.

### 2. Unauthorized Data Modification (High)
**Issue**: The `names` and `audio_submissions` tables have broad `UPDATE` policies that allow **any** authenticated user to modify **any** record.
**Risk**: A malicious user could mark names as "verified" without actually reviewing them, or edit audio submissions they haven't locked.

### 3. Storage Abuse (Medium)
**Issue**: The `vetting_samples` and `pronunciations` storage buckets allow public `INSERT` (uploads) by anyone.
**Risk**: Anonymous users could upload massive files or malicious content to your storage, potentially leading to increased costs or security risks.

### 4. Middleware Path Drift (Low)
**Issue**: The middleware was protecting `/dashboard` but the path was recently renamed to `/studio`. (Fixed during this audit).

## Recommended Fixes

| Table | Action | Proposed Policy |
| :--- | :--- | :--- |
| `profiles` | SELECT | `auth.uid() = id` (Users see only their own profile) |
| `profiles` | UPDATE | Only allow if current role is 'admin' |
| `names` | UPDATE | Only allow if user role is 'contributor' or 'admin' |
| `audio_submissions`| UPDATE | Only allow if user role is 'contributor' or 'admin' AND `locked_by` matches current user |
| `storage` | INSERT | Restrict to authenticated users with a specific role |

## Environment Variable Check
- **Secrets**: No hardcoded secrets found in codebase.
- **GitIgnore**: `.env.local` and `.env*` are correctly ignored.
- **Service Role**: Used only in server-side scripts and route handlers. ✅
