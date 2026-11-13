# CoachingOS — Security, Privacy & Compliance Architecture

## 1. Threat Model & Risk Mitigations

| Threat | Risk Level | Architectural Mitigation |
|---|---|---|
| **Cross-Tenant Data Exposure** | Critical | Every SQL query is parameterized and scoped with `WHERE centre_id = ?`. Centre ID is derived solely from the cryptographically verified session, never from client input. |
| **Guardian IDOR (Insecure Direct Object Reference)** | High | Guardian queries for student records require an explicit join on `student_guardians WHERE student_id = ? AND guardian_id = ?`. Guessing arbitrary student IDs fails with 403 Forbidden. |
| **Teacher Unauthorized Batch Access** | High | Teachers can only query and mutate batches linked in `batch_teachers`. Centre-wide queries are rejected. |
| **Minor Student Privacy Violation** | High | Personal identifiable information (PII) is minimized. No religious, health, biometrics, or geolocation data is collected. Guardian mediation is enforced for junior grades. |
| **Attendance Tampering / Falsification** | High | Every attendance edit generates an immutable `audit_events` record capturing `old_status`, `new_status`, `reason`, `actor_user_id`, and `created_at`. |
| **CSV Formula Injection** | Medium | CSV export and import routines sanitize cells beginning with `=`, `+`, `-`, `@`, `\t`, `\r`. |
| **CSRF & Session Hijacking** | High | Sessions use signed, encrypted, `SameSite=Lax`, `HttpOnly`, `Secure` cookies. Mutating requests enforce `x-csrf-token` header matching the server session token. |
| **Clickjacking & Inline Script Injection** | High | Strict HTTP response headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. |

---

## 2. Minor Protection & Data Minimization Checklist

1. **Minimal Profile Footprint**: Student records store only `admission_no`, `first_name`, `last_name`, `grade_level`, and `enrollment_date`.
2. **No Public Leaderboards**: Academic rankings are kept private to the student and their authorized guardians. Batch-level metrics only display aggregates (e.g. median and mean scores) to prevent psychological harm and public shaming.
3. **Data Retention & Right to be Forgotten**: Centre owners can initiate full student data purging with a mandatory reason recorded in the system audit log.
4. **Export Portability**: Data can be exported in standardized CSV format by verified centre administrators for student school transfers.

---

## 3. Financial Integrity & Decimal Safety

1. **Zero Floating-Point Money**: All monetary amounts (`subtotal_cents`, `discount_cents`, `total_cents`, `paid_cents`) are strictly stored and computed as integer minor units (paise / cents).
2. **Explicit Legal Disclaimer**: Manual payment entries (cash, bank transfer, UPI reference) represent administrative ledger notations. CoachingOS does not store credit/debit card numbers or process live payment rail transactions without certified external gateway integration.
3. **Receipt Immutability**: Receipts are generated strictly upon recording a valid payment entry and cannot be altered retrospectively without creating an offsetting adjustment.
