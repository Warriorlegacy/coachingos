# CoachingOS — Architectural & Product Assumptions

1. **Target Market**: Independent tutors and coaching centres in India first, with built-in multi-currency and timezone support to seamlessly accommodate international educators.
2. **Currency Precision**: Storing currency in integer minor units (paise for INR, cents for USD/EUR) avoids floating-point roundoff issues. Default display formatting uses Indian numbering system (Lakhs/Crores) or standard international format based on centre locale.
3. **Manual Payments vs Gateway**: Coaching centres in India rely overwhelmingly on direct UPI QR code transfers and cash. Manual payment recording satisfies 95% of operational ledger needs without requiring merchant onboarding or credit card gateway fees.
4. **Offline Resilience**: Coaching classrooms frequently have intermittent cellular or Wi-Fi coverage. An offline attendance queue with client-side synchronization and conflict detection is essential for daily adoption.
5. **Guardian Privacy**: Minors do not hold direct financial liability; invoices and attendance notifications are guardian-facing. Student accounts focus on learning tasks, deadlines, and personal assessment progress.
