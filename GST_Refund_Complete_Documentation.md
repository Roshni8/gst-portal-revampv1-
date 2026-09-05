# GST Refunds in India — Complete Process & Framework Documentation

**Prepared as at:** 25 August 2026
**Legal position stated as on:** Finance Act, 2026 (assented 30 March 2026); CGST Rules as amended up to the CGST Amendment Rules notified in 2025–26; CBIC circulars and instructions up to Instruction No. 06/2025-GST (03.10.2025); GSTN Advisory No. 660 dated 18 May 2026.
**Audience:** Non-GST-expert readers (product designers, developers, analysts) who need the actual legal and procedural framework, not a simplified summary.

---

## How to read this document

| Marker | Meaning |
|---|---|
| **(TBC)** | Position not confirmed from an official source, or the source is unclear/silent. Treat as an open question, do not build logic on it. |
| **⚠ Conflict** | Two official sources (or an official source and binding judicial ruling) point in different directions. Both positions are stated. |
| **Act / Rule / Circular / Portal** | The document consistently labels whether a requirement comes from statute, subordinate legislation, administrative clarification, or merely from how the GST portal is built. These are *not* the same in law. |

**Source hierarchy followed:** CGST Act 2017 / IGST Act 2017 → CGST Rules 2017 → Notifications → CBIC Circulars & Instructions → GST Council documents & official FAQs → GSTN portal advisories. Where only secondary commentary was available for a very recent change, that is flagged.

**Important structural caution for anyone designing a product on this:** a great deal of what taxpayers experience as "the refund process" is *portal behaviour* (validations, statement formats, auto-population, offline utilities) rather than law. Portal behaviour changes several times a year without any change in the Act or Rules. The May 2026 Annexure-B overhaul is a recent example.

---

# 1. What is a GST Refund?

## 1.1 The concept from first principles

GST is a **value-added, destination-based consumption tax**. Every registered business in the chain collects tax on what it sells (output tax) and gets credit for the tax charged to it on what it buys (input tax credit, or ITC). It pays the Government only the difference. The tax is designed to stick, ultimately, to the **final consumer** — not to any business in the chain.

A **GST refund** is the mechanism the law provides when, despite this design, money has ended up with the Government that the law says should not stay there. It arises in two economically different situations:

1. **Money was paid that was never due, or was paid twice, or paid under the wrong head.** Here, refund is simply restitution — the State has no legal authority to keep tax collected without authority of law (Article 265, Constitution of India).
2. **Money was legitimately paid at the time, but the law grants a right to have it returned** because the tax burden was never intended to rest on that person. The classic case is exports: India does not tax goods and services that will be consumed in another country, so the tax embedded in an exported product must be released back to the exporter.

Critically: **"GST refund" is not a general-purpose remedy for having too much credit.** Section 54 of the CGST Act is the operative provision, and the Supreme Court in *Union of India v. Torrent Power Ltd.* (decided 17.02.2026) reaffirmed that **Section 54 is a complete and exhaustive code** — no refund can be granted outside its four corners, and courts cannot fashion equitable refund routes that the statute does not contemplate.

## 1.2 The four ledgers and registers (mechanics you must understand first)

Everything in GST refund operates on top of four electronic accounts maintained per GSTIN on the GST portal:

| Account | What sits in it | Legal basis |
|---|---|---|
| **Electronic Cash Ledger** | Actual money deposited by the taxpayer via challan (PMT-06), head-wise (IGST / CGST / SGST / Cess) and minor-head-wise (tax / interest / penalty / fee / others) | Section 49(1), Rule 87 |
| **Electronic Credit Ledger** | Input Tax Credit availed, head-wise. This is *credit*, not money. | Section 49(2), Rule 86 |
| **Electronic Liability Register** | Tax, interest, penalty payable | Section 49(7), Rule 85 |
| **Electronic Credit Reversal & Re-claimed Statement / RCM Liability-ITC Statement** | Sub-ledgers tracking temporarily reversed ITC and RCM credits | GSTN advisories (portal-level, not in the Act) |

Two consequences that surprise people:

- **Money in the Cash Ledger is still the taxpayer's money.** It has not become tax until it is debited to discharge a liability. That is why refund of an unused cash ledger balance is the easiest refund category in the whole system — no unjust-enrichment question arises.
- **Credit in the Credit Ledger is not money and is not automatically refundable.** It is a right to set off future output tax. Refund of credit is an exception granted in only two situations (see 1.6).

## 1.3 Key definitions — keep these separate at all times

| Term | Precise meaning | Common error |
|---|---|---|
| **Output tax liability** | GST charged by the taxpayer on its outward supplies (plus reverse-charge liability, which is payable in cash) | Confusing "GST collected" with "GST payable to Government" |
| **Input Tax Credit (ITC)** | *Eligible* GST charged by suppliers on inward supplies of goods/services, which may be used to offset output tax liability. Eligibility is governed by Sections 16, 17 and 18 — not by the invoice alone. | Treating every rupee of GST on a purchase invoice as ITC. Blocked credits (Section 17(5)), credits not appearing in GSTR-2B, and credits time-barred under Section 16(4) are **not** ITC. |
| **Net GST payable** | Output tax liability **minus** eligible ITC set off in the order prescribed by Section 49/49A/49B and Rule 88A | — |
| **GST refund** | A legally refundable amount the taxpayer is *entitled* to receive under a **specific** refund provision of Section 54 (or Section 55, or Section 77/Section 19 IGST) | Assuming any excess = refundable |

**Say it plainly: excess ITC is not, by default, a refund. Excess cash is.**

## 1.4 Where does the refund money come from?

Refunds are paid out of the consolidated funds — CGST from the Centre, SGST from the respective State, IGST from the IGST pool (which is later settled between Centre and States under the IGST settlement mechanism). Operationally:

- **Cash refunds** are disbursed through **PFMS** (Public Financial Management System) to the taxpayer's validated bank account, on the strength of a payment order in **FORM GST RFD-05**.
- **Credit refunds** that are rejected are not paid in cash at all — the debited credit is *re-credited* to the Electronic Credit Ledger through **FORM GST PMT-03** (Rule 86(4), Rule 93).
- Since Circular No. 125/44/2019-GST, there is **single-authority disbursement**: whichever officer (Central or State) is assigned the taxpayer sanctions the entire refund across all heads, and disbursement of all heads follows from that single sanction.

## 1.5 Who ultimately receives the refund?

Ordinarily the **applicant** (the registered person who bore the tax). But there is a major carve-out: the **doctrine of unjust enrichment**.

Under **Section 54(5) read with Section 54(8)**, a sanctioned refund is credited to the **Consumer Welfare Fund** (Section 57) *instead of* being paid to the applicant, **unless** the case falls within one of the categories listed in Section 54(8). In other words, if the taxpayer has already recovered the tax from its customers, giving it back to the taxpayer would be a windfall; the law sends it to the Consumer Welfare Fund instead.

**Section 54(8) — refund is paid to the applicant (no unjust-enrichment diversion) where it is:**

- (a) refund of tax paid on **zero-rated supplies** (or on inputs/input services used in making such supplies);
- (b) refund of **unutilised ITC** under Section 54(3);
- (c) refund of tax paid on a supply **not provided** (wholly or partly) and for which no invoice was issued, or where a refund voucher was issued;
- (d) refund of tax **paid under the wrong head** (Section 77 CGST / Section 19 IGST);
- (e) tax and interest (or other amount) where the applicant has **not passed on the incidence** to any other person;
- (f) tax/interest borne by such **other class of applicants as the Government may notify**.

*Torrent Power* (SC, 17.02.2026) is the leading authority: where the incidence had been passed on to consumers, Section 54(8)(e) did not apply, the High Court's attempt to create a consumer-compensation mechanism was struck down, and the amount was directed to the Consumer Welfare Fund.

**Evidentiary consequence (Rule 89(2)(l) and (m)):**
- Refund claim **up to ₹2,00,000** → a self-declaration by the applicant that the incidence has not been passed on is sufficient.
- Refund claim **exceeding ₹2,00,000** → a **certificate from a Chartered Accountant or Cost Accountant** to the same effect is required.
- This certificate is **not** required for the categories in Section 54(8)(a)–(d) and (f) — i.e. exports, ITC refunds, wrong-head refunds and Section 55 refunds.

## 1.6 Is "purchase GST minus sale GST = refund" correct?

**No. This is the single most common misconception, and the answer is: almost never.**

The formula `ITC on purchases − output tax on sales` gives you the **balance in the Electronic Credit Ledger**, not a refund. If that number is negative (output > ITC), you pay the difference in cash. If it is positive (ITC > output), the credit **simply carries forward, indefinitely, to the next tax period**. There is no time limit on carrying forward credit, and there is no automatic entitlement to convert it into cash.

Refund of that accumulated credit is available in **only two situations**, set out in the first proviso to **Section 54(3)**:

- **(i) Zero-rated supplies made without payment of tax** (exports and SEZ supplies under LUT/Bond); and
- **(ii) Inverted duty structure** — where the *rate* of tax on **inputs** is higher than the *rate* of tax on **output supplies**.

**And no others.** Credit accumulated because business is seasonal, because a large capital purchase was made, because sales were slow, because stock is unsold, or because the output rate was *cut* by a later notification — none of these is refundable. The credit sits in the ledger and waits.

Three further restrictions inside Section 54(3):
- **First proviso restriction:** no refund of unutilised ITC where the goods exported are subject to **export duty**. The Finance Act (No. 2) 2024, w.e.f. **16.08.2024**, extended this bar to also cover refund of **IGST paid** on zero-rated supply of goods subject to export duty — closing the route of switching to the with-payment option.
- **Second proviso restriction:** no refund if the supplier has availed **drawback** of central tax or has claimed **refund of IGST** paid on such supplies (anti-double-benefit).
- **Notified exclusions:** under the power in Section 54(3), the Government has notified goods/services on which IDS refund is *not* available — principally **Notification No. 5/2017-Central Tax (Rate)**, as amended (e.g. specified goods of Chapters 15 and 27 added w.e.f. 18.07.2022 by Notification No. 9/2022-CT(Rate)), and certain notified services (construction/works-contract style services and certain concessional-rate services).

## 1.7 Worked numerical examples

**Example A — the ordinary case (no refund).**
Purchases ₹10,00,000 + GST @18% = ₹1,80,000 ITC.
Sales ₹15,00,000 + GST @18% = ₹2,70,000 output tax.
Net payable = 2,70,000 − 1,80,000 = **₹90,000 paid in cash**. No refund; the system worked as designed.

**Example B — excess ITC but NO refund.**
Purchases ₹20,00,000 + GST @18% = ₹3,60,000 ITC (stocked up for the season).
Sales ₹8,00,000 + GST @18% = ₹1,44,000 output tax.
Credit ledger closing balance = 3,60,000 − 1,44,000 = **₹2,16,000 carried forward.**
Refund? **No.** This is neither a zero-rated case nor an inverted duty case. The ₹2,16,000 waits in the ledger for future liability. GSTR-3B cannot be filed with a "negative liability"; the excess is simply a closing credit balance.

**Example C — inverted duty structure (refund available).**
Inputs (raw material) ₹10,00,000 + GST @18% = ₹1,80,000.
Output (finished goods) sold ₹12,00,000 + GST @5% = ₹60,000.
Credit accumulates by ₹1,20,000 *structurally* — every single month, because the input rate is permanently higher than the output rate. This is exactly what Section 54(3)(ii) is for. But the refundable amount is **not** ₹1,20,000; it is whatever the Rule 89(5) formula produces, using **ITC on input goods only** (see §3.5).

**Example D — export under LUT (refund available).**
Inputs ₹10,00,000 + GST @18% = ₹1,80,000 ITC.
Exports ₹15,00,000 with **no** IGST charged (LUT route, zero-rated).
Output tax = nil. Credit accumulates by ₹1,80,000, which is refundable under Section 54(3)(i), capped by the Rule 89(4) formula.

**Example E — export with payment of IGST.**
Exports ₹15,00,000 with IGST @18% = ₹2,70,000 paid (using ITC and/or cash). The IGST paid on the shipping bill is refunded automatically through the Customs–GSTN route (Rule 96). No RFD-01 is filed at all.

**Example F — excess cash (refund available, easiest category).**
Taxpayer deposited ₹5,00,000 by challan but the actual liability was ₹4,00,000. ₹1,00,000 sits unused in the Electronic Cash Ledger. Refundable on application under Section 49(6) read with Section 54 — this is the taxpayer's own money, never converted to tax.

## 1.8 Complete list of grounds on which a GST refund can arise

These correspond broadly to the categories the GST portal exposes in FORM GST RFD-01:

1. Refund of **unutilised ITC** on account of **export of goods/services without payment of tax** (LUT/Bond).
2. Refund of **IGST paid on export of goods** (Rule 96 — Customs route, no RFD-01).
3. Refund of **IGST paid on export of services** with payment of tax.
4. Refund of **unutilised ITC** on account of **supplies to SEZ unit/developer without payment of tax**.
5. Refund of **tax paid on supplies to SEZ unit/developer with payment of tax**.
6. Refund of **unutilised ITC on account of inverted duty structure**.
7. Refund to the **supplier** of tax paid on **deemed export** supplies.
8. Refund to the **recipient** of tax paid on **deemed export** supplies.
9. Refund of **excess balance in the Electronic Cash Ledger**.
10. Refund of **excess payment of tax**.
11. Refund of **tax paid under the wrong head** — intra-State subsequently held inter-State, or vice versa (Section 77 CGST / Section 19 IGST).
12. Refund on account of **assessment / provisional assessment / appeal / revision / any other order** (the portal calls this the "ASSORD" category), including refund of **pre-deposit** after a successful appeal.
13. Refund **on account of "any other" ground or reason** (a residual category used, for example, for additional IGST on post-export price revision).
14. Refund to an **unregistered person** — cancelled flat/construction agreement, or terminated long-term insurance policy (Circular No. 188/20/2022-GST).
15. Refund of **unutilised ITC on export of electricity** (Circular No. 175/07/2022-GST; Statement 3B).
16. Refund to **UIN holders** — UN bodies, specified international organisations, foreign diplomatic missions and consulates (Section 55, Rule 95, FORM GST RFD-10); and **Canteen Stores Department (CSD)** refunds of 50% of tax on inward supplies.
17. Refund of **advance tax** deposited by a **Casual Taxable Person / Non-Resident Taxable Person** (Section 54(13)).
18. Refund arising on **finalisation of provisional assessment** (Section 60 read with Section 54).
19. Refund of **Compensation Cess** (parallel to the above, under the Compensation Cess Act read with Section 54).
20. Refund of **IGST to international tourists** on goods carried out of India (Section 15, IGST Act) — **provided for in law but never operationalised. (TBC — no functioning scheme exists as at August 2026.)**

---

# 2. Eligibility, Rules & Restrictions

## 2.1 Who can claim

| Claimant | Provision | Notes |
|---|---|---|
| Any **registered person** | Section 54(1) | The default case |
| **Unregistered person** | Section 54(1) read with Rule 89(2)(ka)/(kb), Statement 8, Circular 188/20/2022-GST | Must take a **temporary registration** using PAN; Aadhaar authentication under Rule 10B required |
| **SEZ unit / developer** | Section 16 IGST, Rule 89 | Can claim where the DTA supplier supplied under LUT |
| **Recipient of deemed export supplies** | Notification 49/2017-CT; Rule 89(1) third proviso | Either supplier or recipient may claim, not both |
| **UIN holders** (UN bodies, embassies, consulates, notified multilateral institutions) | Section 55, Rule 95, FORM GST RFD-10 | Quarterly; subject to reciprocity conditions |
| **Casual / Non-Resident Taxable Person** | Section 54(13) | Refund of advance tax deposited under Section 27(2), only after all returns are furnished |
| **Canteen Stores Department** | Section 55, Notification 6/2017-CT(Rate) | 50% of tax paid on inward supplies |
| **International tourist** | Section 15 IGST | Not operational **(TBC)** |

## 2.2 Time limit — the hard deadline

**Section 54(1): two years from the "relevant date".** This is the most unforgiving rule in the entire refund framework. Missing it generally extinguishes the claim.

**Relevant date (Explanation 2 to Section 54):**

| Situation | Relevant date |
|---|---|
| Export of **goods by sea or air** | Date on which the ship or aircraft **leaves India** |
| Export of **goods by land** | Date on which the goods **pass the frontier** |
| Export of **goods by post** | Date of **despatch** by the Post Office |
| Export of **services** — payment received in advance of invoice | Date of **issue of invoice** |
| Export of **services** — invoice issued first | Date of **receipt of convertible foreign exchange** (or Indian rupees where permitted by RBI) |
| **Deemed exports** | Date on which the **return relating to such deemed exports** is furnished |
| Refund of **unutilised ITC** under Section 54(3) (both zero-rated and IDS) | **Due date for furnishing the return under Section 39 (GSTR-3B) for the tax period in which the claim arises** — substituted w.e.f. 01.10.2022 by Notification 18/2022-CT giving effect to the Finance Act 2022. *Before that date, it was the end of the financial year.* |
| Tax paid **provisionally** | Date of **adjustment of tax after final assessment** |
| Refund to a person **other than the supplier** (e.g. UIN holders) | Date of **receipt of goods or services** — and see Section 54(2): the application must be made **before expiry of two years from the last day of the quarter in which such supply was received** (substituted from "six months" by the Finance Act 2022, w.e.f. 01.10.2022) |
| Refund consequent to a **judgment, decree, order or direction** of an Appellate Authority, Appellate Tribunal or court | Date of **communication** of such judgment/decree/order/direction |
| **Any other case** | Date of **payment of tax** |
| **Wrong-head tax** (Section 77 / Section 19 IGST) | **Two years from the date of payment of tax under the correct head** — Rule 89(1A), inserted by Notification 35/2021-CT, explained in Circular 162/18/2021-GST. Where the correct-head payment predates 24.09.2021, two years run from 24.09.2021. |

**COVID exclusion:** the period from **01.03.2020 to 28.02.2022** is excluded when computing the limitation period under Sections 54 and 55 (Notification 13/2022-CT, following the Supreme Court's suo motu limitation orders).

**⚠ Conflict — is the two-year limit absolute?** The statutory text is clear. However, the Jharkhand High Court in *BLA Infrastructure* (W.P.(T) 6527/2024) and *GTL Infrastructure* (W.P.(T) 5035/2024, 20.08.2025) held, relying on *Muskan Enterprises* (SC), that the word "may" in Section 54(1) is **directory, not mandatory**, specifically in the context of refund of **pre-deposit** following a successful appeal — and that withholding such a refund violates Article 265. This is a narrow, fact-specific carve-out and should not be relied on generally. **Design assumption: treat two years as hard.**

## 2.3 Minimum threshold

**Section 54(14): no refund shall be paid if the amount is less than ₹1,000.** This threshold applies per refund application, head-wise **(TBC — the exact head-wise vs. aggregate application of the ₹1,000 test is not squarely settled by an official clarification; portal behaviour has historically applied it to the claim as a whole).**

**Change in progress:** the 56th GST Council (03.09.2025) recommended removing this threshold for refunds arising from **exports made with payment of tax**, to help small exporters using courier and postal channels, where each consignment generates an IGST amount below ₹1,000 and the amounts were cumulatively significant but individually unclaimable. The **Finance Act, 2026** (assented 30.03.2026) enacted the corresponding amendment to Section 54(14). **As at the date of this document the amendment is stated to come into force "from a date to be notified", and no commencement notification has been confirmed. (TBC — verify the current commencement status before building on it.)**

## 2.4 Conditions precedent that block a refund application

These are the practical gates; failing any one of them means the application either cannot be filed or will be rejected:

1. **All returns for the relevant period must be filed.** GSTR-1 and GSTR-3B for the refund period are prerequisites (Rule 89 read with portal validation). Section 54(10) additionally empowers the officer to **withhold** refund where any return is outstanding.
2. **A valid LUT (FORM GST RFD-11)** must be on record for the financial year if exporting without payment of tax (Rule 96A; Notification 37/2017-CT). LUT is furnished annually; without it, exports must be made on payment of IGST.
3. **The bank account must be validated** against PAN and linked to the GSTIN. A refund cannot be disbursed to an unvalidated or name-mismatched account; PFMS validation failure is one of the largest causes of "sanctioned but not received" refunds.
4. **The ITC being claimed must be reflected in GSTR-2B.** Circular 197/09/2023-GST replaced the older GSTR-2A basis with GSTR-2B. Since **18 May 2026**, the Annexure-B offline utility performs **automated GSTR-2B matching** on every invoice for tax periods from **November 2024** onwards (GSTN Advisory 660).
5. **The credit must be debited from the Electronic Credit Ledger at the time of filing** (Rule 86(3)). The claim amount is locked out of the ledger while the application is pending.
6. **Three-year return-filing bar:** from **01.12.2025**, returns older than three years from their due date cannot be filed at all (Finance Act 2023). Since an ITC refund depends on the return for that period having been filed, very old unfiled periods now permanently foreclose the associated refund.
7. **No pending prosecution:** provisional refund under Rule 91(1) is unavailable where the applicant has been prosecuted for an offence involving tax evasion exceeding ₹250 lakh in the preceding five years.

## 2.5 Documentary requirements (Rule 89(2))

Rule 89(2) prescribes the documentary evidence, and the design principle is: **each document exists to prove one specific legal fact.** Understanding *why* matters more than the list.

| Document | What it proves | Why the Government needs it |
|---|---|---|
| **Statement of invoices** (Statements 1–8, and 9A/9B; from 18.05.2026 filed via the **Annexure-B offline utility as JSON**) | That specific, identified invoices underlie the claim | Prevents duplicate claiming of the same invoice across periods/categories; enables invoice-level matching against GSTR-1/GSTR-2B |
| **Shipping bill / bill of export number and date** | That the goods physically left India | Zero-rating depends on actual export, not on intent |
| **EGM (Export General Manifest)** | That the carrier actually departed | Fixes the relevant date and confirms export |
| **BRC / FIRC** (Bank Realisation / Foreign Inward Remittance Certificate) | That convertible foreign exchange was received | For **export of services**, receipt of foreign exchange is a *definitional* element of "export of services" under Section 2(6) IGST Act — without it there is no export at all |
| **SEZ endorsement certificate** from the specified officer | That the supply was **received for authorised operations** of the SEZ | Zero-rating for SEZ is conditional on authorised operations, not merely on the recipient's SEZ status (Circular 48/22/2018-GST) |
| **Recipient's undertaking (deemed exports)** that ITC has not been availed, and that it does not claim the refund | That there is no double benefit | Only one of supplier/recipient may claim |
| **Bank account details** (as in registration) | Where to pay | PFMS validation; also fraud prevention |
| **Declaration under Section 54(3)(ii)** that refund is not barred by the second proviso (no drawback, no IGST refund claimed) | No double benefit | — |
| **Declaration of non-passing of incidence** (claim ≤ ₹2 lakh) or **CA/CMA certificate** (claim > ₹2 lakh) — Rule 89(2)(l)/(m) | Unjust enrichment | Determines whether money goes to the applicant or to the Consumer Welfare Fund |
| **Order reference** (adjudication/appellate/court order) | The legal basis for an ASSORD refund | — |
| **Statement 8 + cancellation letter + supplier's certificate** (unregistered persons) | That the contract was cancelled, that GST was actually paid to the Government, and that the supplier has not itself adjusted it by credit note | Ensures the Government is not refunding an amount that has already been neutralised upstream |

## 2.6 Restrictions and grounds of rejection — consolidated

**Statutory bars**
- Amount below ₹1,000 (Section 54(14)) — subject to the pending export carve-out.
- Application beyond two years from the relevant date (Section 54(1)).
- ITC refund sought outside the two permitted grounds in Section 54(3).
- Goods exported are subject to **export duty** (first proviso to Section 54(3), as widened w.e.f. 16.08.2024).
- **Drawback of central tax availed**, or IGST refund already claimed on the same supplies (second proviso to Section 54(3)).
- Refund of ITC on **input services and capital goods** in an IDS claim — excluded by the Rule 89(5) formula, upheld by the Supreme Court in *Union of India v. VKC Footsteps India Pvt. Ltd.* (13.09.2021) and reaffirmed in 2025.
- Supplies notified as ineligible for IDS refund (Notification 5/2017-CT(Rate), as amended).
- Unjust enrichment — refund diverted to the Consumer Welfare Fund (Sections 54(5), 54(8), 57).

**Powers to withhold or adjust**
- **Section 54(10):** the proper officer **may withhold** refund where the person has defaulted in furnishing any return, until the return is furnished; and may withhold where tax/interest/penalty is due and unstayed. Order in **FORM GST RFD-07 (Part B)**.
- **Section 54(11):** where an order giving rise to refund is under appeal or further proceedings and the Commissioner is of the opinion that grant of refund would adversely affect revenue, refund may be withheld (with the taxpayer entitled to interest under Section 56 if it ultimately succeeds).
- **Adjustment against outstanding demands:** refund may be adjusted against amounts recoverable — **FORM GST RFD-07 (Part A)**.
- **Important limitation (Instruction 06/2025-GST, para 3.2):** withholding and adjustment under Sections 54(10) and (11) **cannot be applied to a provisionally sanctioned amount**. Where the officer wants to adjust dues, he must skip provisional sanction and move directly to final sanction.

**Partial sanction is normal, not exceptional.** Common causes of partial sanction: formula ceiling under Rule 89(4)/(5) below the amount claimed; invoices not appearing in GSTR-2B; ineligible/blocked ITC included; ITC on input services included in an IDS claim; turnover mismatch with GSTR-1; and the Rule 89(4)(C) restriction (value of zero-rated supply of goods for the formula is capped at **1.5 times the like domestic value**, where applicable).

## 2.7 Interest on delayed refund (Section 56)

- **6% per annum** where a refund ordered under Section 54(5) is not paid within **60 days** of receipt of the application — running from day 61 to the date of refund.
- **9% per annum** (proviso to Section 56) where the refund arises from an order of an adjudicating authority, Appellate Authority, Appellate Tribunal or court **that has attained finality**, and is not paid within 60 days of the application filed consequent to that order.
- Rates notified by **Notification No. 13/2017-Central Tax** dated 28.06.2017.
- **Explanation to Section 56:** an order of refund made by an Appellate Authority/Tribunal/court against an order of the proper officer under Section 54(5) is **deemed** to be an order under Section 54(5) — which is what makes the proviso operative.
- Section 56 was **substituted by the Finance Act, 2023 w.e.f. 01.10.2023**, and Rule 94 was amended (Notification 28/2023-CT) to prescribe the **manner of computation**, including exclusion of periods of delay **attributable to the applicant** (for example, time consumed by a deficiency memo, or the gap between an RFD-08 notice and the RFD-09 reply).
- Interest is sanctioned and paid through **FORM GST RFD-05**.

## 2.8 Provisional refund — the 2025–26 reform (this is the biggest recent change)

Historically, Section 54(6) allowed 90% provisional refund for **zero-rated supplies**, but in practice officers scrutinised claims first and the facility was largely dead letter, causing chronic working-capital blockage for exporters.

**What changed:**

- The **56th GST Council** (03.09.2025) recommended amending **Rule 91(2)** so that 90% provisional sanction is driven by **system-based risk identification and evaluation** rather than officer discretion.
- **Notification 13/2025-Central Tax dated 17.09.2025** notified the Rule 91(2) amendment, effective **01.10.2025**. It applies to refund applications filed **on or after 01.10.2025**; earlier applications follow the old process.
- **Notification 14/2025-Central Tax dated 17.09.2025** notified, under Section 54(6), the **categories of registered persons who shall NOT be granted provisional refund**: (a) any person who has **not undergone Aadhaar authentication under Rule 10B**; and (b) persons engaged in supply of certain **notified goods identified by tariff item** (the "sensitive goods" list — pan masala, tobacco and substitutes, areca nut and similar).
- **Instruction No. 06/2025-GST dated 03.10.2025** operationalised it. Key operative content (quoting the structure of the Instruction):
  - Applications continue to be processed as before **up to** issue of **RFD-02** (acknowledgement) or **RFD-03** (deficiency memo), and those timelines "should be strictly adhered to".
  - Where the system categorises an application as **"low-risk"**, **90% of the amount claimed shall be sanctioned provisionally**, and **scrutiny is not required** once RFD-02 has issued.
  - Applications **not** categorised as low-risk get **no provisional sanction**; the officer proceeds to detailed scrutiny.
  - A **proviso to Rule 91(2)** lets the officer decline provisional sanction on a case-by-case basis **for reasons recorded in writing** — but the Instruction directs that this be "used sparingly", not on presumptive reasons or routine scrutiny.
  - If final admissible refund turns out to be **less than** the provisional amount, the officer issues a **show cause notice in RFD-08** under Section 54 read with Section 73/74/74A.
  - Implementation is to be **supervised by the jurisdictional Principal Commissioner/Commissioner**, with reporting upward.
- **Extension to Inverted Duty Structure:** the Council also recommended amending **Section 54(6)** itself to extend 90% provisional refund to IDS claims. Because that requires an Act amendment plus corresponding State amendments, CBIC decided, **as an interim trade-facilitation measure**, that for **IDS refund applications filed on or after 01.10.2025**, 90% may be sanctioned provisionally in the same manner as for zero-rated supplies (Instruction 06/2025-GST, paras 5–5.3). GSTN enabled the functionality.
- **Statutory footing:** the **Finance Act, 2026** amended **Section 54(6)** to insert IDS refunds into the provisional-refund clause. **The amendment is stated to take effect from a date to be notified; commencement status as at August 2026 is unconfirmed (TBC).** Until then, IDS provisional refunds rest on the administrative interim measure, not on the amended statute.

---

# 3. Complete GST Refund Process — All Major Scenarios

## 3.0 The common process spine (applies to every RFD-01 scenario)

Before the scenario-by-scenario detail, here is the shared lifecycle. Scenario sections below only describe what differs.

**Forms used across all categories**

| Form | Purpose | Filed/issued by | Timeline |
|---|---|---|---|
| **RFD-01** | Refund application (all categories except Rule 96 IGST-on-export-of-goods) | Taxpayer | Within 2 years of relevant date |
| **RFD-02** | Acknowledgement; generates the date from which the 60-day clock runs | Proper officer | Within **15 days** of filing (Rule 90(2)) |
| **RFD-03** | Deficiency memo — application is returned, credit is re-credited, a **fresh** application must be filed | Proper officer | Within **15 days** (Rule 90(3)) |
| **RFD-04** | Provisional refund order — 90% | Proper officer | Within **7 days** of RFD-02 (Rule 91(2)) |
| **RFD-05** | Payment order / payment advice — triggers PFMS disbursement; also used to pay Section 56 interest | Proper officer | On sanction |
| **RFD-06** | Final sanction / rejection order | Proper officer | Within **60 days** of receipt of complete application (Section 54(7)) |
| **RFD-07** | **Part A** — order for adjustment of refund against outstanding demand; **Part B** — order for withholding refund (Rule 92(1A), Rule 94) | Proper officer | — |
| **RFD-08** | Show cause notice proposing rejection (full or part) | Proper officer | Before any rejection |
| **RFD-09** | Reply to RFD-08 | Taxpayer | Within **15 days** of RFD-08 |
| **RFD-10** | Refund application by UIN holders (embassies, UN bodies, notified agencies) | UIN holder | Quarterly |
| **RFD-10A / RFD-10B** | CSD refund application | Canteen Stores Department | — |
| **RFD-11** | Letter of Undertaking for export without payment of IGST | Taxpayer | Annually, before first export of the FY |
| **RFD-01W** | Withdrawal of a filed refund application (Rule 90(5)/(6)) | Taxpayer | Any time before RFD-04/RFD-06/RFD-07 issues |
| **PMT-03** | Re-credit of rejected refund amount to the Electronic Credit Ledger (Rule 86(4), Rule 93) | Proper officer | On finality of rejection |
| **PMT-03A** | Re-credit where an **erroneous refund** already paid has been redeposited by the taxpayer (Rule 86(4B), Circular 174/06/2022-GST) | Proper officer | Preferably within 30 days of request/payment |
| **DRC-03** | Voluntary payment — used to deposit back erroneous or excess provisional refunds | Taxpayer | — |
| **DRC-07** | Summary of demand where excess refund is recovered | Proper officer | — |

**The standard lifecycle**

```
Triggering event (export / accumulation / excess payment / order)
   ↓
Prerequisites: GSTR-1 + GSTR-3B filed; LUT filed (if applicable); bank account validated
   ↓
Taxpayer prepares Annexure-B via the GSTN offline utility (ITC categories) → JSON
   ↓
RFD-01 filed on portal → credit/cash ledger debited (Rule 86(3)) → ARN generated
   ↓
System risk-scores the application (for applications filed on/after 01.10.2025)
   ↓
Within 15 days: RFD-02 (acknowledgement) ────────► or RFD-03 (deficiency memo) → re-credit → refile afresh
   ↓
[If low-risk & eligible] Within 7 days of RFD-02: RFD-04 → 90% provisional → RFD-05 → PFMS
   ↓
Detailed examination by proper officer (Rule 92)
   ↓
If issues: RFD-08 (SCN) → taxpayer replies in RFD-09 within 15 days → hearing
   ↓
Within 60 days of complete application: RFD-06 (sanction in full / in part / rejection)
   ↓
RFD-07 Part A (adjust against dues) and/or Part B (withhold) if applicable
   ↓
RFD-05 payment order → PFMS → credit to validated bank account
   ↓
Rejected portion → PMT-03 re-credit to Electronic Credit Ledger (on undertaking not to appeal, or on appeal failing)
   ↓
If >60 days: interest under Section 56 @6% (or 9% for post-order refunds), computed per Rule 94
```

**Roles**

| Actor | Role |
|---|---|
| **Taxpayer** | Determines category, computes eligible amount, assembles invoice-level evidence, files RFD-01, responds to RFD-03/RFD-08, tracks ARN |
| **GST Portal (GSTN)** | Validates return filing, debits ledgers, runs GSTR-2B matching on Annexure-B, computes risk score, routes to jurisdiction, generates ARN, tracks status |
| **Proper officer (Central or State, per assignment)** | Acknowledges/returns, sanctions provisionally, examines, issues SCN, passes final order, orders withholding/adjustment |
| **Customs / ICEGATE** | For Rule 96 IGST-on-export-of-goods refunds, acts as the *de facto* sanctioning system by matching shipping bill + EGM + GSTR-1 |
| **PFMS** | Disburses to the validated bank account |
| **Appellate Authority / GSTAT / High Court** | Adjudicates disputes; GSTAT was operationalised following the 56th Council with a **30 June 2026** cut-off for backlog appeals |

---

## 3.1 Scenario 1 — Export of GOODS with payment of IGST (Rule 96)

**A. When does this situation occur?**
An exporter chooses not to use an LUT and instead charges IGST on the export invoice, pays it (using ITC and/or cash), and claims the IGST back. Common where the exporter has large accumulated ITC it wants to monetise, or where LUT was not filed in time.

**B. Who can claim it?**
The registered exporter of goods who paid IGST on the export. Barred where the goods are subject to **export duty** (first proviso to Section 54(3), extended to IGST refunds w.e.f. 16.08.2024) or where **drawback of central tax** has been claimed.

**C. What does the taxpayer need to do?**
1. File the **shipping bill** at ICEGATE, correctly declaring GSTIN, invoice number, and IGST paid. *The shipping bill itself is deemed to be the refund application under Rule 96(1).*
2. Report the export invoice in **GSTR-1 Table 6A** with matching invoice number, value, and IGST.
3. Pay the IGST and file **GSTR-3B** for that period (Table 3.1(b)).
4. Ensure the **EGM** is filed by the carrier.
5. **No RFD-01 is filed.** Refund flows automatically once the three-way match succeeds.
6. Monitor rejected/held invoices on the portal (Services → Refunds → *Track status of invoice data to be shared with ICEGATE*), and on ICEGATE's public enquiry.

**D. Forms**

| Form | Filed by | When | Why | Key fields | Government use |
|---|---|---|---|---|---|
| Shipping Bill / Bill of Export | Exporter (via CHA) at ICEGATE | At export | Deemed refund application (Rule 96(1)) | GSTIN, invoice no./date, IGST amount, port, bank account | Primary refund trigger |
| GSTR-1 Table 6A | Exporter | Monthly/quarterly | Declares the export invoice into GSTN | Invoice no., date, value, IGST, shipping bill no./date, port code | Matched against ICEGATE |
| GSTR-3B | Exporter | Monthly/quarterly | Actual payment of the IGST claimed | Table 3.1(b) zero-rated outward supplies | Confirms the tax was paid, not merely declared |
| RFD-11 (LUT) | Not applicable in this route | — | — | — | — |

**E. Supporting information**
Shipping bill and EGM (proof of physical export and departure), export invoice, and a **validated bank account registered with Customs/ICEGATE** (this is a separate registration from the GST bank account — a very common failure point).

**F. Government processing**
Fully system-to-system. GSTN transmits GSTR-1 Table 6A data to ICEGATE; ICEGATE matches invoice-level data against the shipping bill and confirms EGM filing; on a successful match, the Customs system generates a scroll and credits the exporter's bank account. There is **no human sanction order and no RFD-06** in the normal course. Where mismatch occurs (SB005 invoice mismatch, SB006 EGM error, and similar), the invoice is held and must be corrected — historically through amendment in GSTR-1 or officer-level correction at the port.

**G. Outcomes**
Full refund on successful match; **held/rejected invoices** on mismatch (correctable, and the claim is not lost); **withheld** where a risk flag exists; **recovery under Rule 96B** if export proceeds are not realised within the FEMA period.

---

## 3.2 Scenario 2 — Export of GOODS or SERVICES without payment of tax (LUT) — refund of unutilised ITC

**A. When does this situation occur?**
The exporter files a Letter of Undertaking and exports without charging IGST. Since output tax is nil, ITC on inputs and input services accumulates in the Electronic Credit Ledger with nothing to set off against. This is the most commonly used export route because it avoids blocking cash upfront.

**B. Who can claim it?**
Any registered exporter of goods or services holding a valid LUT for the financial year. For **services**, the transaction must satisfy every limb of "export of services" in Section 2(6) of the IGST Act: supplier in India, recipient outside India, place of supply outside India, **payment received in convertible foreign exchange** (or INR where RBI permits), and supplier and recipient not merely establishments of the same person.

**C. What does the taxpayer need to do?**
1. File **RFD-11 (LUT)** for the financial year before exporting.
2. Export and, for goods, ensure shipping bill and EGM are in order; for services, obtain **FIRC/BRC** for each invoice.
3. File GSTR-1 (Table 6A/6B) and GSTR-3B for the period.
4. Compute maximum admissible refund under the **Rule 89(4) formula**.
5. Prepare **Annexure-B through the GSTN offline utility** (mandatory since 18.05.2026) with invoice-wise, **HSN/SAC-wise** inward supply details; generate the JSON.
6. File **RFD-01** under the relevant category, upload the Annexure-B JSON via *"Click to upload the Statement of invoices (Unutilized ITC)"*, plus Statement 3 (goods) or Statement 3A / relevant statement, and supporting documents.
7. Ledger is debited; ARN generated; track status.

**Rule 89(4) formula (zero-rated supplies):**

```
Refund Amount = (Turnover of zero-rated supply of goods + Turnover of zero-rated supply of services) × Net ITC
                ─────────────────────────────────────────────────────────────────────────────────────────────
                                            Adjusted Total Turnover

Net ITC                  = ITC availed on inputs AND input services during the relevant period
                           (capital goods and blocked credits under Section 17(5) excluded)
Adjusted Total Turnover  = Turnover in a State/UT, excluding the value of exempt supplies
                           (other than zero-rated), and excluding turnover of supplies for
                           which refund is claimed under Rule 89(4A)/(4B) where applicable
```

**Note the asymmetry, which matters a great deal:** for **zero-rated** refunds under Rule 89(4), **input services ARE included** in Net ITC. For **inverted duty** refunds under Rule 89(5), they are **excluded**. Same taxpayer, different formula, depending on why the credit accumulated.

**Rule 89(4)(C) cap:** the "turnover of zero-rated supply of goods" is restricted to the value that is the lower of (i) the actual FOB value, and (ii) **1.5 times the value of like goods supplied domestically** by the same or a similarly placed supplier. This anti-overvaluation cap frequently produces partial sanction.

**D. Forms**
RFD-11 (LUT, annual); RFD-01 (application); **Annexure-B JSON** (invoice-level inward supplies with HSN/SAC and ITC classification — eligible / ineligible / blocked / reversal); Statement 3 (export of goods without payment) or Statement 3A (computation) or Statement 2/4 as applicable for services; then RFD-02/03/04/05/06/08/09 as per the common spine.

**E. Supporting information and why it is needed**
- **Shipping bill + EGM** — proof the goods actually left India; zero-rating is a fact, not a declaration.
- **FIRC/BRC** — for services, foreign exchange realisation is *constitutive* of export; without it, the supply is a domestic supply and the refund collapses entirely.
- **Invoice-level inward supply data with HSN/SAC** — enables the system to verify each rupee of Net ITC against GSTR-2B and to detect the same invoice being claimed twice.
- **Declaration that no drawback of central tax was claimed** — prevents double benefit.
- **CA/CMA certificate** where required — unjust enrichment (usually not required here, as this falls in Section 54(8)(a)/(b)).

**F. Government processing**
RFD-01 → risk score → RFD-02 within 15 days (or RFD-03) → **RFD-04 provisional 90% within 7 days if low-risk** → detailed examination under Rule 92 (formula verification, GSTR-2B matching, LUT validity, turnover reconciliation with GSTR-1/3B) → RFD-08 if any part is proposed to be denied → RFD-09 reply → RFD-06 final order within 60 days → RFD-05 → PFMS.

**G. Outcomes**
Full sanction; **partial sanction** (very common — formula ceiling, 1.5× cap, unmatched invoices, ineligible ITC); rejection (invalid LUT, export not established, foreign exchange not realised, time-barred); deficiency memo requiring a fresh application; adjustment against dues (RFD-07 Part A); withholding (RFD-07 Part B); and post-sanction **recovery under Rule 96B** if export proceeds are not realised.

---

## 3.3 Scenario 3 — Export of SERVICES with payment of IGST

**A. When does this situation occur?**
A service exporter chooses to charge and pay IGST on the export invoice rather than use an LUT.

**B. Who can claim it?** The registered service exporter, provided the supply meets Section 2(6) IGST Act.

**C. What does the taxpayer need to do?**
Unlike export of goods, **there is no Customs route for services** — there is no shipping bill. The exporter must file **RFD-01** with **Statement 2** (invoice-wise details of export of services with IGST paid, together with the corresponding **BRC/FIRC**). Foreign exchange must be realised and evidenced.

**D. Forms** RFD-01 + Statement 2; standard RFD-02/04/05/06/08/09 chain.

**E. Supporting information** Export invoices; **BRC/FIRC per invoice** (the pivotal document); agreement/contract where the officer questions the nature of the service; evidence that supplier and recipient are not establishments of the same person (Explanation 1 to Section 8, IGST Act).

**F. Government processing** Same spine as 3.2; provisional 90% available for low-risk applications. Verification centres on whether the transaction is genuinely an export of services and whether foreign exchange was realised for the exact invoices claimed.

**G. Outcomes** As in 3.2. The characteristic failure mode here is **recharacterisation as an intermediary service or as a domestic supply**, which converts a refund claim into a demand.

> **Note (2026):** the Finance Act, 2026 gave effect to the 56th Council's recommendation on the **place of supply for intermediary services** (moving to the recipient's location by omitting the special rule), which materially expands the population of Indian service providers who qualify as exporters. **Commencement date to be notified (TBC).**

---

## 3.4 Scenario 4 — Supplies to SEZ unit / SEZ developer

**A. When does this situation occur?**
A supplier in the Domestic Tariff Area (DTA) supplies goods or services to an SEZ unit or developer. Such supplies are **zero-rated** under Section 16(1)(b) of the IGST Act — but only to the extent they are for **authorised operations**.

**B. Who can claim it?**
- **With payment of IGST:** the **DTA supplier** claims refund of the IGST paid (Rule 89(1) proviso).
- **Without payment (under LUT):** the **DTA supplier** claims refund of accumulated ITC; alternatively, in specified situations, the **SEZ unit/developer** may claim.
Only one of them may claim for the same supply.

**C. What does the taxpayer need to do?**
1. Establish that the supply is for **authorised operations** and obtain an **endorsement from the specified officer of the SEZ** (Circular 48/22/2018-GST; Rule 89(2)(e)/(f)).
2. Report the supply correctly in GSTR-1 as an SEZ supply (with or without payment).
3. File **RFD-01** with **Statement 4** (SEZ supplies with payment) or **Statement 5 / 5A** (SEZ supplies without payment, with the ITC computation), and Annexure-B JSON where ITC refund is involved.
4. Declare that the SEZ unit/developer has not availed ITC of the tax paid by the supplier.

**D. Forms** RFD-01 + Statement 4 / 5 / 5A + Annexure-B JSON (for ITC route); RFD-11 (LUT) where supplying without payment; standard chain thereafter.

**E. Supporting information** SEZ **endorsement certificate** (proof of receipt for authorised operations — the defining condition); evidence of receipt of goods/services by the SEZ; declaration by the SEZ entity that it has not availed ITC; invoices; and, where the SEZ entity itself claims, its own ITC statement.

**F. Government processing** Standard RFD-01 spine, with the endorsement certificate being the principal verification item. Provisional 90% available.

**G. Outcomes** Full/partial sanction; rejection where the endorsement is absent or the supply is found not to relate to authorised operations; recovery where both supplier and SEZ entity have claimed.

---

## 3.5 Scenario 5 — Inverted Duty Structure (Section 54(3)(ii))

**A. When does this situation occur?**
The GST rate on **inputs** is structurally higher than the rate on **output supplies** — so credit accumulates every period no matter how well the business trades. Classic sectors: fertilisers, certain textiles and made-ups, footwear, pharmaceuticals, LPG bottling, printing/publishing, solar and renewable equipment, certain construction inputs.

**Critically, the inversion must be structural, not incidental.** Refund is *not* available where:
- output supplies are **nil-rated or exempt** (there is no "output rate" to be inverted against);
- the credit accumulated merely because turnover was low;
- the accumulation arose because ITC relates to **capital goods** or **input services**;
- the goods/services fall in the **notified exclusion list** (Notification 5/2017-CT(Rate) as amended);
- **the same goods are both input and output and the rate merely changed over time.** This last one is important and current: the official FAQ issued with the **56th Council's rate rationalisation (effective 22.09.2025)** expressly answers that accumulated credit arising because the output rate was *reduced* on 22.09.2025 is **not** refundable, relying on Circular 135/05/2020-GST — input and output being the same goods, attracting different rates at different points in time, are not covered by Section 54(3)(ii). Such credit stays in the ledger and is used against future liability.

**B. Who can claim it?** Any registered person — manufacturer, trader, or service provider — whose input **goods** carry a higher rate than its taxable output supplies, subject to the exclusions above.

**C. What does the taxpayer need to do?**
1. Confirm a genuine rate inversion by mapping input HSNs to output HSNs for the tax period.
2. Confirm the outputs are not in the notified exclusion list and are not exempt/nil-rated.
3. File GSTR-1 and GSTR-3B for the period.
4. Compute the ceiling under **Rule 89(5)**.
5. Prepare **Annexure-B via the offline utility**, being careful to segregate **ITC on input goods** from ITC on input services and capital goods, and to report reversals correctly.
6. File **RFD-01** (category: *Refund on account of ITC accumulated due to inverted tax structure*) with **Statement 1 / 1A**.
7. The relevant date is the **due date of GSTR-3B** for the period — file within two years of that date.

**Rule 89(5) formula (as amended by Notification 14/2022-CT dated 05.07.2022):**

```
Maximum Refund = { (Turnover of inverted rated supply of goods and services) × Net ITC }  −  { Tax payable on such
                    ──────────────────────────────────────────────────────────              inverted rated supply
                                 Adjusted Total Turnover                                     of goods and services
                                                                                             ×  Net ITC        }
                                                                                                ───────────────
                                                                                                ITC availed on
                                                                                                inputs and input
                                                                                                services

Net ITC = ITC availed on INPUTS (goods) during the relevant period
          — the amended formula reduces the refund proportionately by reference to input-service ITC,
            so that the net effect is that only input-goods ITC is refundable.
```

**Plain-language effect:** ITC on **input services and capital goods is not refundable** under IDS. The Supreme Court upheld this in *Union of India v. VKC Footsteps India Pvt. Ltd.* (13.09.2021), holding that refund is a statutory right that Parliament consciously confined to input goods, while noting the anomalies in the formula and inviting the GST Council to reconsider. The position was reaffirmed by the Supreme Court in 2025 (*Aberdare Technologies*).

> **⚠ Conflict — prospectivity of the amended formula.** Circular **181/13/2022-GST** (10.11.2022) states the Notification 14/2022-CT amendment is **prospective** (applications filed on or after 05.07.2022). The **Gujarat High Court in *Ascent Meditech Ltd.*** (2024) held it is **clarificatory and retrospective** and quashed the contrary part of Circular 181; the Supreme Court **dismissed the Revenue's SLP** in *Union of India v. Tirth Agro Technology* (2025). The department's stated position and the judicial position therefore differ, most sharply in Gujarat. Product logic should not hard-code either.

> **⚠ Conflict — "same goods at different rates".** Circular **135/05/2020-GST** denied IDS refund where input and output are the same goods with a rate differential arising from a rate change. Four High Courts (Gauhati — *BMG Informatics*; Rajasthan — *Baker Hughes*; Calcutta — *Shivaco Associates*; Telangana — *Micro Systems*) read this down or quashed it as exceeding the statute. CBIC then issued **Circular 173/05/2022-GST** (06.07.2022) clarifying that refund **is** available where the inversion results from a **concessional rate notification** on the output — but not from a mere rate reduction over time. The Kerala High Court in *Malabar Fuel Corporation* (2024) went further. CBIC's 56th-Council FAQ (2025) reaffirms the Circular 135 position for rate-cut cases.

**D. Forms** RFD-01 + Statement 1/1A + Annexure-B JSON; RFD-02/03/04/05/06/08/09 as standard.

**E. Supporting information and why**
- **Invoice-wise, HSN-wise inward supply data** — the only way to segregate input goods from input services, which is the entire basis of the formula.
- **Outward supply turnover data (inverted-rated only)** — the numerator of the formula.
- **ITC reversal details** — reversals under Rules 42/43 and Section 17(5) must reduce Net ITC.
- **Declaration under the second proviso to Section 54(3)** — no drawback, no IGST refund.
- **CA/CMA certificate** if claim exceeds ₹2 lakh **(not required for IDS, which falls in Section 54(8)(f) — but portal/officer practice varies; (TBC))**.

**F. Government processing** Standard spine. **Since 01.10.2025, IDS applications are eligible for 90% provisional sanction** where the system marks them low-risk (Instruction 06/2025-GST, para 5.1) — administratively, pending commencement of the Finance Act 2026 amendment to Section 54(6). Detailed verification concentrates on formula computation, correctness of the input/input-service split, and GSTR-2B matching.

**G. Outcomes** Full sanction; **partial sanction is the norm** (mis-segregation of input services is the single largest cause of reduction); rejection where no genuine inversion exists, outputs are exempt, or the goods are in the excluded list; deficiency memo; adjustment/withholding.

---

## 3.6 Scenario 6 — Deemed exports

**A. When does this situation occur?**
Certain domestic supplies are notified under **Section 147** as "deemed exports" — the goods do not leave India, but the supply is treated as an export for refund purposes. Notified categories (Notification 48/2017-CT): supply against **Advance Authorisation**; supply of capital goods against **EPCG Authorisation**; supply to an **Export Oriented Unit (EOU/EHTP/STP/BTP)**; and supply of **gold by a bank or notified agency** against Advance Authorisation.

**B. Who can claim it?**
**Either the supplier or the recipient — but not both.** Where the recipient claims, the supplier must furnish an undertaking that it will not claim; where the supplier claims, the recipient must certify that it has **not availed ITC** on those invoices.

**C. What does the taxpayer need to do?**
1. Ensure the supply is correctly reported as a **deemed export** in GSTR-1 (the tax is charged and paid; deemed exports are **not** zero-rated, so tax must be paid first and then refunded).
2. Assemble the authorisation/licence copies and the recipient's acknowledgement of receipt.
3. File **RFD-01** with **Statement 5B** *(deemed export)* — the relevant date is the **date on which the return relating to such deemed exports is furnished**.

**D. Forms** RFD-01 + Statement 5B; supplier's or recipient's undertakings; standard chain thereafter.

**E. Supporting information and why**
- **Advance Authorisation / EPCG / EOU documentation** — establishes the supply falls within a notified category at all.
- **Recipient's endorsement of receipt** — proves the supply actually reached the notified entity.
- **Undertaking that ITC has not been availed** and **that the other party will not claim** — the anti-double-benefit control, since here there are two candidate claimants for the same tax.

**F. Government processing** Standard spine, with heavy documentary verification. **Provisional refund is NOT available** for deemed exports — Section 54(6) is limited to zero-rated supplies (and now, administratively, IDS). Deemed exports are not zero-rated.

**G. Outcomes** Full/partial sanction; rejection where authorisation conditions are unmet, where the recipient has availed ITC, or where both parties have claimed.

---

## 3.7 Scenario 7 — Excess balance in the Electronic Cash Ledger

**A. When does this situation occur?**
The taxpayer deposited more by challan than was needed — a wrong-head deposit, an abandoned payment, a duplicate challan, an over-estimate, or accumulated **TDS/TCS credits** (from Sections 51/52) that exceed liability. On surrender/cancellation of registration, any leftover cash balance is also refundable.

**B. Who can claim it?** Any registered person (and, after cancellation, the erstwhile registered person) with an unused balance.

**C. What does the taxpayer need to do?**
File **RFD-01** under *Refund of excess balance in Electronic Cash Ledger*. The balance is auto-populated from the ledger; the taxpayer selects the head-wise and minor-head-wise amounts to claim. All returns must be up to date. No invoice statement, no Annexure-B, and **no unjust-enrichment certificate** — this is the applicant's own money, never converted into tax.

**D. Forms** RFD-01 only (auto-populated), then RFD-02 → RFD-06 → RFD-05.

**E. Supporting information** Essentially none beyond the ledger itself and validated bank details. This is by far the lightest-touch category.

**F. Government processing** Straightforward verification that the balance exists, that returns are filed, and that no dues are outstanding. Note **Section 54(10)/(11)** apply — the officer may adjust the balance against any outstanding demand (RFD-07 Part A) before paying.

**G. Outcomes** Full refund; partial where dues are adjusted; withheld where returns are outstanding.

> **2025 development (portal-level):** a **GSTN advisory dated 28.08.2025** enabled refunds arising from **assessment / enforcement / appeal / revision / any other order (ASSORD)** to be claimed irrespective of Demand ID status where the demand amount is **negative** — including where a **minor head** carries a negative balance even though the cumulative balance is positive or zero. The negative balance auto-populates into RFD-01. This closed a long-standing gap where appellate relief had reduced a demand but the money could not be extracted from the system.

---

## 3.8 Scenario 8 — Excess payment of tax

**A. When does this situation occur?**
Tax was correctly deposited but wrongly *applied* — e.g. the same invoice reported twice in GSTR-1 and paid twice in GSTR-3B; tax paid on an advance for a supply that was subsequently cancelled and for which a **refund voucher** was issued; arithmetic error in GSTR-3B that cannot be corrected because the credit-note window under Section 34 has closed.

**B. Who can claim it?** The registered person who made the excess payment.

**C. What does the taxpayer need to do?**
First exhaust the self-correction routes — amendment in a subsequent GSTR-1, or a **credit note under Section 34** (available only up to **30 November following the end of the financial year**, or the date of filing the annual return, whichever is earlier). Only where those routes are closed does refund under Section 54 arise. File **RFD-01** under *Excess payment of tax*, with **Statement 7** and a reconciliation.

**D. Forms** RFD-01 + Statement 7; standard chain.

**E. Supporting information** Reconciliation of GSTR-1 vs GSTR-3B vs books showing the excess; the refund voucher where a supply was not made; evidence that the amount was **not** recovered from the customer, or that it was returned to the customer — **because this category is squarely subject to unjust enrichment.** A CA/CMA certificate is required above ₹2 lakh.

**F. Government processing** Standard spine, with the unjust-enrichment question front and centre. If the officer concludes the incidence was passed on, the amount is sanctioned **to the Consumer Welfare Fund**, not to the applicant (*Torrent Power*, SC 2026).

**G. Outcomes** Refund to applicant; **refund credited to Consumer Welfare Fund**; partial; rejection; adjustment.

---

## 3.9 Scenario 9 — Tax paid under the wrong head (Section 77 CGST / Section 19 IGST)

**A. When does this situation occur?**
A supply was treated as intra-State and CGST+SGST were paid, but it is later held to be inter-State (IGST payable), or vice versa. Extremely common in place-of-supply disputes, bill-to/ship-to transactions, and services with ambiguous place of supply.

**B. Who can claim it?** The registered person who paid under the wrong head — **after** paying the tax under the correct head.

**C. What does the taxpayer need to do?**
1. **Pay the tax under the correct head first.** This is a precondition; no refund arises until the correct payment is made.
2. Note that **no interest is payable** on the correct-head payment (Section 77(2) / Section 19(2)) — the law treats this as a classification error, not a default.
3. File **RFD-01** under *Refund of tax paid on intra-State supply subsequently held to be inter-State supply and vice versa*, **within two years from the date of payment under the correct head** (Rule 89(1A)).

**"Subsequently held" — clarified.** Circular **162/18/2021-GST** (25.09.2021) clarifies that this covers **both** the case where the officer holds it in proceedings **and** where the **taxpayer itself** discovers the error. This removed a genuinely absurd earlier reading under which a taxpayer had to be caught before it could correct itself.

**D. Forms** RFD-01 (wrong-head category); challan evidencing correct-head payment; standard chain.

**E. Supporting information** Both sets of payment particulars; the invoice(s); the basis for the place-of-supply determination; any order that held the supply to be inter/intra-State.

**F. Government processing** Standard spine. This category is **exempt from unjust enrichment** (Section 54(8)(c)) — the refund goes to the applicant.

**G. Outcomes** Full refund typically; **refund is not available where the taxpayer has already neutralised the transaction by issuing a credit note under Section 34** (Circular 162, para 4.4) — that is a self-correction, not a refund situation.

---

## 3.10 Scenario 10 — Refund on account of assessment / provisional assessment / appeal / revision / any other order ("ASSORD")

**A. When does this situation occur?**
An adjudication order, appellate order, revisional order, GSTAT order or court judgment reduces or cancels a demand that the taxpayer has already paid — including the mandatory **pre-deposit** under Section 107(6) or 112(8) — or a provisional assessment is finalised at a lower figure.

**B. Who can claim it?** The person in whose favour the order operates.

**C. What does the taxpayer need to do?**
File **RFD-01** under the ASSORD category, quoting the order, **within two years from the date of communication of the order**. The refund of pre-deposit carries interest under **Section 115**. Since the August 2025 GSTN change, negative demand balances auto-populate.

**D. Forms** RFD-01 (ASSORD) + certified copy of the order + demand reference; standard chain.

**E. Supporting information** The order and evidence it has attained finality (or at least that no stay operates); proof of the original payment/pre-deposit; the demand ID.

**F. Government processing** Standard spine. **Section 54(11)** is the live risk here: where the order giving rise to refund is under further appeal and the **Commissioner** opines that refund would adversely affect revenue, refund may be **withheld** — with interest payable to the taxpayer if it ultimately succeeds.

**G. Outcomes** Refund with interest; **withholding under Section 54(11)** pending departmental appeal; adjustment against other dues; rejection on limitation (contested — see the ⚠ conflict at §2.2).

> **Interest note:** where the refund flows from an order that has **attained finality** and is not paid within 60 days of the consequent application, interest runs at **9%**, not 6% (proviso to Section 56). Departments frequently pay only 6%; this has been litigated repeatedly and decided in taxpayers' favour where the appellate facts are genuine.

---

## 3.11 Scenario 11 — Refund to an UNREGISTERED person (cancelled flat booking / terminated insurance policy)

**This is the most consumer-facing refund category in the entire GST framework, and the one most relevant to ordinary citizens.**

**A. When does this situation occur?**
An individual books a flat from a builder and pays instalments plus GST. The project is delayed or the buyer withdraws, and the agreement is cancelled. Or an individual pays GST on a long-term insurance premium and the policy is terminated. In both cases the buyer paid GST but never received the service. The supplier cannot issue a **credit note** because the Section 34 time limit has expired — so the GST is stranded: the builder/insurer has already paid it to the Government, and the buyer cannot recover it from anyone.

**B. Who can claim it?**
The **unregistered buyer/policyholder**, under Section 54(1) read with Rule 89(2)(ka)/(kb) and **Circular No. 188/20/2022-GST** (27.12.2022) — the enabling provisions were inserted by Notification 26/2022-CT (26.12.2022), which also inserted **Statement 8** in RFD-01.

**C. What does the taxpayer need to do?**
1. Obtain a **temporary registration** on the GST portal using **PAN**, selecting the **same State/UT in which the supplier is registered** (a separate temporary registration is needed per State and per supplier where these differ).
2. Complete **Aadhaar authentication** under Rule 10B.
3. Enter **bank account details in the applicant's own name**.
4. File **RFD-01** under the category *Refund for Unregistered person*, with **Statement 8**.
5. File within **two years from the date of the letter of cancellation issued by the supplier** — Circular 188 clarifies that, for a long-term contract cancelled before the service is rendered, the **date of issuance of the cancellation letter by the supplier** is the relevant date under clause (g) of Explanation 2 to Section 54.

**D. Forms** Temporary registration application; RFD-01 + Statement 8; standard chain thereafter.

**E. Supporting information and why**
- **Copy of the agreement/policy and the cancellation/termination letter** — establishes the supply was not rendered and fixes the relevant date.
- **Invoices issued by the builder/insurer** — identify the GST actually charged.
- **Proof of payment** by the buyer.
- **Certificate from the supplier** that it has **paid the tax to the Government** and has **not adjusted it** by way of a credit note — this is the pivotal document. Without it the Government would be refunding money it may never have received, or refunding twice.
- **Certificate from a Chartered Accountant/Cost Accountant** where applicable.

**F. Government processing**
Processed like any other RFD-01 claim. The officer verifies: whether the contract was in fact cancelled; whether the credit-note window under Section 34 had genuinely expired; whether the supplier paid the tax; and whether the application is within two years of the cancellation letter.

**G. Outcomes**
Full refund of the GST component; **proportionate refund** where the supplier refunded only part of the consideration — Circular 188 is explicit that only the tax proportionate to the amount actually returned by the supplier is refundable; rejection where the supplier issued a credit note (the correction has already happened upstream), where the certificate is unobtainable, or where the claim is time-barred.

**Design note for anyone building here:** the friction in this journey is severe and almost entirely non-legal — a lay citizen must discover that this remedy exists at all, obtain a temporary GST registration, complete Aadhaar authentication, identify the correct State, and extract a signed certificate from a builder or insurer who has no incentive to cooperate. The legal entitlement is clear; the access path is the problem.

---

## 3.12 Scenario 12 — Refund to UIN holders (UN bodies, embassies, consulates) and CSD

**A. When does this situation occur?**
Diplomatic missions, consulates, UN agencies and notified multilateral financial institutions pay GST on their inward supplies. They cannot use ITC because they make no outward taxable supplies, so the tax is refunded to them directly under **Section 55**.

**B. Who can claim it?** Holders of a **Unique Identity Number (UIN)** notified under Section 55; and the **Canteen Stores Department**, which gets refund of **50%** of the tax paid on its inward supplies (Notification 6/2017-CT(Rate)).

**C. What does the taxpayer need to do?**
File **FORM GST RFD-10** (quarterly) together with the statement of inward supplies in **GSTR-11**. Under Section 54(2), the application must be made **before the expiry of two years from the last day of the quarter in which the supply was received** (extended from six months by the Finance Act 2022, w.e.f. 01.10.2022). CSD files **RFD-10A/10B**.

**D. Forms** GSTR-11 (statement of inward supplies against UIN); RFD-10; RFD-10A/10B for CSD.

**E. Supporting information** Tax invoices **bearing the UIN** (suppliers are required to record the UIN on the invoice — if they do not, the claim fails); and satisfaction of the **reciprocity** and other conditions prescribed in Rule 95.

**F. Government processing** Verification against GSTR-11 and supplier filings; refund sanctioned and disbursed in the normal manner. Refund under Section 55 is exempt from unjust enrichment (Section 54(8)(d)).

**G. Outcomes** Full refund; partial where invoices do not bear the UIN or conditions are unmet.

---

## 3.13 Scenario 13 — Casual Taxable Person / Non-Resident Taxable Person: refund of advance tax

**A. When does this situation occur?**
A CTP or NRTP (e.g. an exhibitor at a trade fair, or a foreign entity supplying temporarily in India) must deposit **advance tax** equal to its estimated liability at the time of registration (Section 27(2)). Actual liability usually turns out lower.

**B. Who can claim it?** The CTP/NRTP.

**C. What does the taxpayer need to do?**
Under **Section 54(13)**, the balance advance tax is refundable **only after all returns required during the period of registration have been furnished**. The claim is made in the **last return** filed.

**D. Forms** GSTR-1/GSTR-3B (CTP) or GSTR-5 (NRTP); refund claim through the last return; RFD-01 where required.

**E. Supporting information** Return filings for the entire registration period; the original advance deposit challan.

**F. Government processing** Verification that all returns are filed and liabilities discharged, then sanction of the residual balance.

**G. Outcomes** Refund of the unused balance; withholding where returns are outstanding (this is an absolute bar, not discretionary).

---

## 3.14 Scenario 14 — Refund of unutilised ITC on export of ELECTRICITY

**A. When does this situation occur?** Electricity is exported, but there is no shipping bill and no conventional export documentation, so neither the Rule 96 route nor standard Statement 3 works.

**B. Who can claim it?** The registered person exporting electricity.

**C. What does the taxpayer need to do?** File **RFD-01** under the dedicated category, using **Statement 3B**, per **Circular No. 175/07/2022-GST** (06.07.2022), with the Regional Energy Account / scheduling data as the evidence of export.

**D. Forms** RFD-01 + Statement 3B.

**E. Supporting information** Regional Energy Account issued by the Regional Power Committee, energy scheduling documents, the export agreement, and the tariff/invoice data — these substitute for the shipping bill.

**F. Government processing** Standard spine; the Annexure-B offline utility (from 18.05.2026) expressly covers electricity-export refund claims.

**G. Outcomes** As per the standard categories.

---

## 3.15 Scenario 15 — Additional IGST paid on post-export upward price revision

**A. When does this situation occur?** Goods are exported, and the contract price is subsequently revised upward (common in commodity and long-term supply contracts). The exporter pays additional IGST on the differential — but the original shipping bill cannot be reopened, so the Rule 96 route is unavailable.

**B. Who can claim it?** The exporter who paid the additional IGST.

**C. What does the taxpayer need to do?** Per **Circular No. 226/20/2024-GST**, file **RFD-01** under the category **"Any other"**, with **Statements 9A and 9B**, until a dedicated portal category is developed.

**D. Forms** RFD-01 ("Any other") + Statements 9A/9B.

**E. Supporting information** Original shipping bill and export invoice; the revised invoice/debit note; evidence of receipt of the additional foreign exchange; proof of payment of the additional IGST.

**F. Government processing** Manual verification, since automated Customs matching is not possible for the differential.

**G. Outcomes** Full/partial sanction; rejection if the additional foreign exchange is not realised.

---

## 3.16 Scenario 16 — Refund on finalisation of provisional assessment

**A. When does this situation occur?** Tax was paid provisionally under **Section 60** (typically where valuation or rate could not be determined), and on final assessment the tax due is lower than what was paid.

**B. Who can claim it?** The registered person assessed provisionally.

**C. What does the taxpayer need to do?** File **RFD-01** citing the final assessment order. The **relevant date is the date of adjustment of tax after final assessment**.

**D. Forms** ASMT-07 (final assessment order) → RFD-01 → standard chain.

**E. Supporting information** Provisional assessment order, bond/security furnished, final assessment order, payment particulars.

**F. Government processing** Standard spine; release of the bond/security follows.

**G. Outcomes** Refund with interest under Section 56 where delayed; adjustment against dues.

---

## 3.17 Appendix to Section 3 — Statement map for FORM GST RFD-01

The "Statements" are the structured annexures to RFD-01. Selecting the wrong one is a routine cause of deficiency memos.

| Statement | Used for |
|---|---|
| **1 and 1A** | Refund of ITC on account of **inverted duty structure** (1A carries the invoice-level inward/outward detail) |
| **2** | **Export of services** with payment of tax |
| **3** | **Export of goods/services without** payment of tax (under LUT) |
| **3A** | Computation of refund for export without payment of tax |
| **3B** | **Export of electricity** (Circular 175/07/2022-GST) |
| **4** | Supplies to **SEZ** unit/developer **with** payment of tax |
| **5 and 5A** | Supplies to **SEZ** unit/developer **without** payment of tax, and the computation |
| **5B** | **Deemed exports** |
| **6** | Tax paid on a supply subsequently held to be **inter-State instead of intra-State, or vice versa** (change in place of supply) |
| **7** | **Excess payment** of tax |
| **8** | Refund by an **unregistered person** (Notification 26/2022-CT; Circular 188/20/2022-GST) |
| **9A and 9B** | **Additional IGST** on post-export upward price revision (Circular 226/20/2024-GST) |

**Since 18 May 2026 (GSTN Advisory No. 660):** for refund categories involving **accumulated ITC** — exports without payment of tax, SEZ supplies, inverted duty structure, and export of electricity — **Annexure-B must be prepared using the prescribed Excel-based offline utility and uploaded as a JSON file**. PDF Annexure-B has been discontinued. Operating characteristics reported from the advisory:

- **Invoice-wise and HSN/SAC-wise** reporting of inward supplies is mandatory. Where one invoice covers multiple HSN/SAC codes or supply categories, it must be split into separate line items with proportionate tax values.
- **Duplicate entries are hard-rejected** by the system.
- Uploaded invoices are **validated against GSTR-2B**. Validation applies to GSTR-2B periods from **November 2024 onwards**; invoices for **October 2024 or earlier** are accepted but shown as "Not Validated" (this is normal behaviour, not an error). Failures appear in an **Invalid Documents Report**.
- Capacity: **10,000 line items per file**, up to **25 files (2,50,000 entries)** per refund application; invoices beyond that may be submitted as PDF.
- **ITC reversals** must be captured only in the final file where multiple utility files are used.

---

# 4. Edge Cases & Special Situations

These are the situations a product designer or developer must model explicitly, because each one breaks the happy path.

## 4.1 Deficiency memo (RFD-03) — the most consequential procedural trap

- Issued under **Rule 90(3)** within 15 days where the application is found deficient.
- The application is **not** amended in place. The debited amount is **re-credited**, and the taxpayer must file a **fresh application** with a **new ARN**.
- **The 60-day clock and the interest clock restart from the new ARN.** A deficiency memo therefore costs the taxpayer the entire elapsed time.
- **Rule 90(3) proviso:** the time between the original filing and the deficiency memo is excluded from the two-year limitation period — so a deficiency memo does not, by itself, destroy an otherwise timely claim.
- **Circular 125/44/2019-GST:** once **RFD-02** (acknowledgement) has been issued, a **fresh deficiency memo cannot be issued** on the same application. Officers sometimes attempt this; it is not permitted.
- Repeated deficiency memos on successive fresh applications have been a persistent complaint and a frequent subject of writ petitions.

## 4.2 Refund exceeding the eligible amount / excess provisional refund

- Where the amount finally found admissible is **less than the provisional 90%** already released, the officer issues **RFD-08** under Section 54 read with **Section 73 / 74 / 74A**, and recovery follows with interest (Instruction 06/2025-GST, para 3.4).
- Where an **erroneous refund** has been paid and the taxpayer repays it voluntarily via **DRC-03**, the corresponding ITC can be restored to the Electronic Credit Ledger through **FORM GST PMT-03A** under **Rule 86(4B)**, per **Circular 174/06/2022-GST**, on a written request in the prescribed Annexure — preferably within 30 days.

## 4.3 Duplicate claims and overlapping periods

- The same invoice cannot support two claims. The Annexure-B utility now performs **duplicate-entry hard rejection** and cross-checks against GSTR-2B.
- The historical bar on "bunching" refund claims across financial years was **relaxed** — claims spanning financial years are permissible (Circular 135/05/2020-GST as subsequently modified, and Circular 125). **(TBC — verify the current portal behaviour for cross-FY claims, which has varied.)**
- **Circular 110/29/2019-GST:** a taxpayer who filed a **NIL refund claim** for a period is **not barred** from subsequently filing an actual claim for the same period, subject to conditions.
- The May 2025 portal change delinked certain refund categories (export of services with payment, SEZ with payment, deemed exports by supplier) from "select tax period", making them **invoice-based** rather than period-based. **(TBC — confirm current category coverage on the live portal.)**

## 4.4 Missing, mismatched or unmatched invoices

- **Not in GSTR-2B** → not valid ITC → excluded from Net ITC → partial sanction. Since 18.05.2026 this is detected at upload, not at scrutiny, which is faster but also unforgiving.
- **Shipping bill / GSTR-1 mismatch** (Rule 96 route) → invoice held at ICEGATE, refund not scrolled. Correctable, but the exporter must actively monitor; nothing notifies them.
- **EGM not filed by the carrier** → refund stalls for a reason entirely outside the exporter's control.

## 4.5 Incorrect or ineligible ITC in the claim

- ITC blocked under **Section 17(5)**, ITC attributable to exempt supplies (Rules 42/43), and ITC time-barred under **Section 16(4)** must be excluded from Net ITC. Including them typically produces partial sanction plus, in aggravated cases, proceedings under Section 73/74.
- **ITC on input services and capital goods** included in an IDS claim is the single most common substantive error.

## 4.6 Outstanding Government dues and non-filing of returns

- **Section 54(10):** refund may be **withheld** where any return is outstanding, until it is filed (RFD-07 Part B).
- **Section 54(11):** refund may be withheld where the underlying order is under appeal and the Commissioner opines revenue would be adversely affected.
- **Adjustment against dues** via RFD-07 Part A.
- **But:** none of this can be applied to a **provisionally** sanctioned amount — the officer must instead move to final sanction and recover from that (Instruction 06/2025-GST, para 3.2).

## 4.7 Bank account problems

- Refund is disbursed only to a bank account that is **validated against PAN** and linked to the GSTIN. Name mismatches, closed accounts, IFSC changes after bank mergers, and accounts not in the applicant's own name are extremely common causes of "sanctioned but not received".
- For **Rule 96** IGST-on-export refunds, the relevant account is the one registered with **Customs/ICEGATE**, which is a *different* registration from the GST bank account — a distinction many exporters do not know exists.
- For **unregistered persons**, the account must be in the applicant's own name.

## 4.8 Multiple GSTINs and multiple registrations

- Refund is **GSTIN-specific and State-specific**. A group with registrations in ten States must file ten separate applications; credit cannot be pooled or transferred between GSTINs (except through the ISD mechanism for distribution of input-service credit, which is a different thing entirely and, since 01.04.2025, **mandatory** for eligible cases).
- For **unregistered persons** claiming under Circular 188, a **separate temporary registration and separate application per State and per supplier** is required.
- **Circular 104/23/2019-GST** addressed the situation of taxpayers **wrongly mapped** to a jurisdiction on the portal.

## 4.9 Export proceeds not realised (Rule 96B)

- Where a refund of unutilised ITC on export of goods, or of IGST paid on export of goods, has been paid but the **sale proceeds are not realised** within the period allowed under **FEMA** (including any RBI extension), the exporter must **deposit the proportionate refunded amount with interest within 30 days** of expiry of that period.
- Failure to do so → recovery as an **erroneous refund** under **Section 73/74/74A** with interest under Section 50.
- **Relief:** where the **RBI writes off** the requirement of realisation, no recovery is made. Where proceeds are realised later and evidence is produced within three months, the recovered amount is re-refunded to that extent.
- **Reported development:** the RBI extended the export realisation period from **9 months to 15 months** in November 2025. **(TBC — verify against the current FEMA/RBI Master Direction before relying on it.)**
- **⚠ Note on vires:** Rule 96B is argued to have lacked statutory backing before **01.10.2023**, when an enabling amendment took effect. Its applicability to earlier exports is contested. **(TBC)**

## 4.10 Withdrawal, amendment and correction

- A filed refund application can be **withdrawn** in **FORM GST RFD-01W** (Rule 90(5)/(6)) at any time **before** RFD-04, RFD-06 or RFD-07 is issued; the debited amount is re-credited.
- There is **no facility to amend a filed RFD-01.** Withdrawal followed by a fresh application is the only route — and the fresh application must still be within the two-year limitation.
- Filing under the **wrong category** is not fatal in principle: in *Pentacle Plant Machineries Pvt. Ltd.* the court held that a technical filing error cannot defeat a substantive entitlement, and directed the claim to be considered under the correct category. Officers, however, commonly reject on this ground first.

## 4.11 Rejection and re-credit

- Rejection (in full or part) is preceded by **RFD-08** and the taxpayer's **RFD-09** reply; a personal hearing must be granted where requested or where an adverse order is contemplated.
- Rejected **ITC** is re-credited to the Electronic Credit Ledger via **PMT-03** under Rule 86(4)/Rule 93 — but **only once the rejection is final**: either the taxpayer furnishes an **undertaking not to file an appeal**, or the appeal is finally decided against it (Explanation to Rule 93).
- **Practical trap:** taxpayers who neither appeal nor furnish the undertaking end up with the credit permanently frozen — debited from the ledger, not refunded, and not re-credited. Officers have at times required the undertaking in a specific format; Annexure I to Circular 174/06/2022-GST is the reference format for re-credit requests.

## 4.12 The tax-rate-change trap (highly relevant right now)

Following the **GST 2.0 rate rationalisation effective 22 September 2025** (two principal slabs of 5% and 18%, with a 40% demerit rate), many businesses hold ITC accumulated at old, higher input rates against outputs now taxed at lower rates.

**Official position (56th Council FAQ, read with Circular 135/05/2020-GST):** ITC may be used against liability for supplies made **up to 21.09.2025**. For supplies made **on or after 22.09.2025**, where the input and output are **the same goods** attracting different rates at different points in time, the accumulation is **not covered by Section 54(3)(ii)** and is **not refundable**. The credit remains in the ledger for future use. Where the output becomes **fully exempt**, the attributable ITC must be **reversed** and cannot be refunded at all.

Distinguish carefully: a **structural** inversion (different input and output goods, permanently different rates) remains refundable; a **temporal** rate cut on the same goods is not.

## 4.13 Refund of ITC on capital goods and input services — the standing gap

Neither is refundable under IDS. Government officials indicated in October 2025 that a mechanism to allow **capital goods** ITC refund under IDS was being examined, with input services expected to take longer, but nothing was to be introduced until GST 2.0 stabilised. Industry representations continue ahead of the 57th Council. **As at August 2026 no such change has been enacted. (TBC — confirm whether the 57th GST Council has met and what it decided.)**

## 4.14 Refunds and the appellate route

- Rejection is appealable to the **Appellate Authority** under Section 107 (pre-deposit 10% of disputed tax), then to the **GST Appellate Tribunal (GSTAT)** under Section 112.
- GSTAT was operationalised following the 56th Council, with hearings from December 2025 and **30 June 2026** set as the limitation date for filing backlog appeals. The **Principal Bench** also functions as the National Appellate Authority for Advance Ruling.
- Where a refund is ultimately allowed by an appellate forum, the **Explanation to Section 56** deems that order to be an order under Section 54(5), which unlocks the **9%** interest rate if the consequent refund is delayed beyond 60 days.

## 4.15 Other situations worth modelling

| Situation | Treatment |
|---|---|
| **Refund on cancellation/surrender of registration** | Cash ledger balance is refundable; **ITC balance is not** — it lapses (subject to Section 29(5) reversal requirements on stock held) |
| **Merchant exporters buying at 0.1% concessional rate** | Concessional-rate purchase creates inversion for the *supplier*; the supplier may claim IDS refund (Circular 94/13/2019-GST) |
| **Job work chains across States** | Refund is claimed by the principal; Circular 94/13/2019-GST addresses the manufacturer-exporter/job-worker split |
| **Compensation Cess** | Refundable in parallel with the tax refund where the underlying category qualifies; must be claimed head-wise |
| **TDS (Section 51) and TCS (Section 52) credits** | Flow into the **cash** ledger, so any excess is refundable as excess cash-ledger balance — not as ITC |
| **Composition taxpayers** | Cannot claim ITC refunds at all. The **Negative Liability Statement** in **CMP-08** is a different mechanism and does not create a refund entitlement |
| **Zero-rated supply of goods subject to export duty** | No refund of ITC **and** no refund of IGST paid, w.e.f. 16.08.2024 |
| **Refund claims where the officer never acts** | The remedy is a writ petition; courts have consistently held that Sections 54(10)/(11) are procedural tools and not a licence for indefinite delay |
| **Portal/technical failure preventing filing** | In *Vision Products Pvt. Ltd.* the court held a taxpayer cannot be prejudiced by failures of the Government's own portal |
| **International tourist refund (Section 15 IGST)** | Provided for in law; **never operationalised**. The related Circular 106/25/2019-GST on retail outlets at international airports was withdrawn in 2025. **(TBC)** |

---

# 5. Q&A — Excess ITC, "negative liability", and what the taxpayer/CA actually does

**Question:** *What happens when a taxpayer has more Input Tax Credit than GST liability, resulting in a negative/net credit balance? If a negative GST liability cannot be filed, what happens to the excess, and what adjustments must the taxpayer or CA make?*

## 5.1 The premise needs correcting first

There is **no such thing as a "negative GST liability"** for a regular taxpayer, and GSTR-3B has no field capable of expressing one. The correct way to describe the situation is:

> **Output tax liability = ₹X. Eligible ITC = ₹Y, where Y > X. Liability is discharged in full to ₹0. The unused ₹(Y − X) remains as a positive closing balance in the Electronic Credit Ledger.**

The ledger holds a **positive credit balance**, not a negative liability. GSTR-3B is filed normally with nil net payable (subject to any cash-only liabilities — reverse charge under Section 9(3)/9(4), which **must** be paid in cash and cannot be set off against ITC, and interest/late fee, which are also cash-only).

## 5.2 What happens to the excess

**It carries forward automatically and indefinitely.** There is:
- **no time limit** on how long credit may sit in the Electronic Credit Ledger;
- **no lapse provision** for regular accumulation (contrast the specific lapse notifications historically issued for certain textile items);
- **no automatic refund**;
- **no facility to transfer it to another GSTIN** (other than the ISD mechanism for input-service credit distribution, or transfer on business transfer/merger under Section 18(3) via **FORM GST ITC-02**).

## 5.3 When the excess IS refundable — and when it is not

| Reason the credit accumulated | Refundable? | Provision |
|---|---|---|
| Exports / SEZ supplies made **without payment of tax** under LUT | **Yes** | Section 54(3)(i), Rule 89(4) |
| **Inverted duty structure** — input goods rate structurally higher than output rate | **Yes**, but only ITC on **input goods**, and only up to the Rule 89(5) formula | Section 54(3)(ii), Rule 89(5) |
| Low sales, seasonality, slow-moving stock | **No** | Outside Section 54(3) |
| Large capital-goods purchase | **No** | Capital goods ITC excluded from both formulas |
| ITC on **input services** | **No** for IDS (*VKC Footsteps*); **Yes** as part of Net ITC for zero-rated refunds under Rule 89(4) | Rule 89(4) vs Rule 89(5) |
| Output rate **reduced** by a later notification, same goods in and out | **No** | Circular 135/05/2020-GST; 56th Council FAQ |
| Output became **exempt** | **No** — ITC must be **reversed**, not refunded | Section 17, Rules 42/43 |
| Business closed / registration surrendered | **No** — the credit balance lapses | Section 29(5) |

## 5.4 What the taxpayer / CA actually does — practical checklist

1. **Diagnose why the credit accumulated.** This single question determines everything. Structural inversion → refund. Zero-rated supplies → refund. Anything else → carry forward.
2. **Verify the ITC is genuinely eligible** before treating it as an asset: present in GSTR-2B; not blocked under Section 17(5); not time-barred under Section 16(4); proportionate reversals under Rules 42/43 made.
3. **File GSTR-3B normally** with nil net cash payable, ensuring reverse-charge liability is paid in **cash**.
4. **Reconcile the two sub-ledgers** that can now block filing: the **Electronic Credit Reversal and Re-claimed Statement** and the **RCM Liability/ITC Statement**. Per the GSTN advisory of **29.12.2025**, **negative balances in these statements will block GSTR-3B filing**. A negative reclaim balance means excess ITC was re-claimed earlier and must be reversed in **Table 4(B)(2)** of the current GSTR-3B (and if no ITC is available, that reversal becomes a cash liability). A negative RCM balance means RCM ITC was availed without paying the RCM liability, fixed either by paying it in Table 3.1(d) or by reducing the RCM ITC claimed in Table 4A(2)/4A(3). *(This is a different problem from a healthy accumulated credit balance, but it is the situation most often described loosely as "negative ITC".)*
5. **If refundable:** compute the ceiling under the correct formula, prepare **Annexure-B through the offline utility**, file **RFD-01** within **two years of the GSTR-3B due date** for the period, and track the ARN. Since 01.10.2025, a low-risk claim should receive **90% provisionally**.
6. **If not refundable:** report the closing balance accurately in **GSTR-9** (annual return) and, where applicable, **GSTR-9C**, and plan for utilisation. Note that from **FY 2024-25**, GSTR-9 is not required where aggregate turnover does not exceed ₹2 crore (Notification 15/2025-CT).
7. **Do not** attempt to "adjust" excess ITC by understating output liability, inflating reverse-charge, or claiming a refund under a category that does not fit. Each of these converts a benign carry-forward into a Section 73/74 exposure.
8. **Where the credit is stranded for structural reasons the law does not remedy** (capital goods, input services), the remaining routes are commercial (restructure the supply chain, review classification) or representational — not a refund claim. Note that non-refundable, non-usable GST credit written off in the books has been held allowable as a **business loss** for income-tax purposes in some rulings **(TBC — fact-specific; take advice)**.

---

# 6. The Conceptual Distinctions — restated as a single reference

| # | Concept | Definition | What it is NOT |
|---|---|---|---|
| 1 | **GST liability (output tax)** | GST the taxpayer owes the Government on its outward supplies, plus reverse-charge liability | Not the same as GST collected — reverse charge is owed without being collected, and credit notes reduce it |
| 2 | **Input Tax Credit (ITC)** | *Eligible* GST paid on inputs, input services and capital goods, usable to offset output tax liability, subject to Sections 16, 17, 18 | Not every rupee of GST on a purchase invoice. Not money. Not automatically refundable. Not transferable between GSTINs |
| 3 | **Net GST payable** | Output tax liability minus eligible ITC set off in the prescribed order | Cannot be negative. Reverse-charge liability is excluded from set-off and payable in cash |
| 4 | **Excess ITC / accumulated credit** | Closing positive balance in the Electronic Credit Ledger | Not a refund. Not a receivable from the Government unless it falls in Section 54(3)(i) or (ii) |
| 5 | **Excess cash balance** | Unused money in the Electronic Cash Ledger | Not tax at all — it is the taxpayer's money and is refundable on application |
| 6 | **GST refund** | A legally refundable amount the taxpayer is entitled to receive under a **specific** provision — Section 54 (with Rules 89–97A), Section 55, or Section 77/Section 19 IGST | Not a general remedy for having paid or accrued more than one would like. Section 54 is a **complete code** (*Torrent Power*, SC 2026) |
| 7 | **Provisional refund** | 90% released early under Section 54(6)/Rule 91, subject to final determination | Not a sanction. Recoverable with interest if the final figure is lower. Cannot be adjusted against dues |
| 8 | **Consumer Welfare Fund** | Where a sanctioned refund goes when the tax incidence was passed on to customers | Not a penalty — the refund is *sanctioned*, just not paid to the applicant |

**The one-line rule to carry away:** *not all excess ITC, and not every excess payment of GST, is automatically refundable — refundability depends entirely on which specific statutory provision the situation falls under.*

---

# 7. What changed in 2025–26 (quick reference for currency)

| Date | Change | Source |
|---|---|---|
| 16.08.2024 | Refund of ITC **and** of IGST barred for zero-rated supply of goods subject to **export duty** | Finance Act (No. 2) 2024 |
| 08.10.2024 | **Rule 96(10), 89(4A) and 89(4B) omitted** — removing the bar on IGST-refund for exporters who had availed Advance Authorisation/EPCG/EOU benefits. Held **prospective**, but applicable to all proceedings not finally adjudicated as on that date (Gujarat HC, *Addwrap Packaging*; followed elsewhere) | Notification 20/2024-CT |
| 22.09.2025 | **GST 2.0 rate rationalisation** — principally two slabs (5% / 18%) plus a 40% demerit rate. Reduces structural inversion in many sectors; creates temporary, **non-refundable** credit accumulation in others | 56th GST Council; rate notifications |
| 17.09.2025 | **Rule 91(2) amended** for system-risk-based provisional refund (effective 01.10.2025); **categories excluded** from provisional refund notified (no Aadhaar authentication under Rule 10B; specified sensitive goods) | Notifications 13/2025-CT and 14/2025-CT |
| 01.10.2025 | **90% provisional refund** on a system-risk basis for zero-rated supplies, for applications filed on or after this date | Rule 91(2) |
| 03.10.2025 | Operational instructions: low-risk claims sanctioned 90% provisionally **without scrutiny** after RFD-02; the officer's power to decline is to be used **sparingly** and only with written reasons; IDS extended the same treatment **as an interim measure** | Instruction No. 06/2025-GST |
| 28.08.2025 | Portal change enabling **ASSORD** refunds where a demand balance is negative, including at minor-head level | GSTN advisory |
| 01.11.2025 | Simplified GST registration scheme for small/low-risk businesses (automated grant within 3 working days) | 56th Council |
| 01.12.2025 | **Three-year bar** on filing old returns takes effect — which permanently forecloses refunds dependent on those returns | Finance Act 2023 |
| 29.12.2025 | Negative balances in the **Credit Reversal & Re-claimed Statement** and **RCM Liability/ITC Statement** to block GSTR-3B filing | GSTN advisory |
| 17.02.2026 | Supreme Court in ***Union of India v. Torrent Power Ltd.*** — Section 54 is a complete and exhaustive code; where incidence is passed on, the amount goes to the **Consumer Welfare Fund** | Supreme Court |
| 30.03.2026 | **Finance Act, 2026** enacted: Section **54(6)** amended to place **IDS provisional refunds** on a statutory footing; Section **54(14)** amended to remove the **₹1,000 threshold** for export-with-payment refunds; Section 15(3)(b)/34 post-sale discount changes; intermediary place-of-supply change. **All stated to take effect from dates to be notified — commencement status as at August 2026 unconfirmed (TBC)** | Finance Act, 2026 |
| 18.05.2026 | **Annexure-B offline utility mandatory** (JSON upload) for all accumulated-ITC refund categories; invoice-wise and HSN/SAC-wise reporting; duplicate hard-rejection; **GSTR-2B validation** for periods from Nov 2024 | GSTN Advisory No. 660 |
| Pending | **57th GST Council** — expected to take up registration, refund and audit process reform; refund of ITC on **capital goods** (and possibly input services) under IDS is under examination. **(TBC — confirm whether it has met and what was decided)** | Press reports |

---

# 8. Sources consulted

**Statute**
- Central Goods and Services Tax Act, 2017 — Sections 16–18, 27, 29, 34, 39, 49, 50, 51, 52, 54, 55, 56, 57, 58, 60, 73, 74, 74A, 77, 107, 112, 115, 147
- Integrated Goods and Services Tax Act, 2017 — Sections 2(6), 8, 13, 15, 16, 19
- Finance Act (No. 2), 2024; Finance Act, 2023; Finance Act, 2022; **Finance Act, 2026**

**Rules** — CGST Rules, 2017: Rules 10B, 42, 43, 85, 86, 87, 88A, **89, 90, 91, 92, 93, 94, 95, 96, 96A, 96B, 97, 97A**

**Notifications** — 13/2017-CT (interest rates); 16/2017-CT and 37/2017-CT (LUT); 5/2017-CT(Rate) and 9/2022-CT(Rate) (IDS exclusions); 48/2017-CT and 49/2017-CT (deemed exports); 6/2017-CT(Rate) (CSD); 35/2021-CT (Rule 89(1A)); 14/2022-CT (Rule 89(5) formula; Rule 86(4B)); 18/2022-CT (IDS relevant date); 13/2022-CT (COVID limitation exclusion); 26/2022-CT (Statement 8); 28/2023-CT (Section 56/Rule 94); **20/2024-CT** (omission of Rules 89(4A), 89(4B), 96(10)); **13/2025-CT** and **14/2025-CT** (provisional refund); 15/2025-CT (GSTR-9 exemption threshold)

**Circulars and Instructions** — 24/24/2017; 37/11/2018; 45/19/2018; 48/22/2018; 59/33/2018; 70/44/2018; 79/53/2018; 94/13/2019; 104/23/2019; 106/25/2019 (withdrawn); 110/29/2019; **125/44/2019 (master circular)**; **135/05/2020**; 147/17/2021; **162/18/2021**; 166/22/2021; **173/05/2022**; 174/06/2022; 175/07/2022; **181/13/2022**; **188/20/2022**; **197/09/2023**; 202/14/2023; 226/20/2024; 233/27/2024; 249/06/2025; 251/08/2025; 253/2025; **Instruction No. 06/2025-GST dated 03.10.2025**

**GST Council** — Recommendations and official FAQs of the **56th meeting (03.09.2025)**; GST Council Secretariat newsletters

**GSTN** — Advisory dated 08.05.2025 (invoice-based refund filing); advisory dated 28.08.2025 (ASSORD); advisory dated 29.12.2025 (reversal/reclaim and RCM statements); **Advisory No. 660 dated 18.05.2026 (Annexure-B offline utility)**

**Judicial** — *Union of India v. VKC Footsteps India Pvt. Ltd.* (SC, 13.09.2021); *Union of India v. Torrent Power Ltd.* (SC, 17.02.2026); *Aberdare Technologies* (SC, 2025); *Union of India v. Tirth Agro Technology* (SC, SLP dismissed, 2025); *Ascent Meditech Ltd.* (Gujarat HC, 2024); *Addwrap Packaging Pvt. Ltd.* (Gujarat HC, 2025); *BMG Informatics* (Gauhati HC); *Baker Hughes Asia Pacific* (Rajasthan HC); *Shivaco Associates* (Calcutta HC); *Micro Systems & Services* (Telangana HC); *Malabar Fuel Corporation* (Kerala HC, 2024); *GTL Infrastructure* and *BLA Infrastructure* (Jharkhand HC); *Pentacle Plant Machineries*; *Vision Products*

---

## 9. Known limitations of this document

1. **Commencement dates.** The Finance Act, 2026 amendments to Sections 54(6) and 54(14) were enacted on 30.03.2026 but take effect "from a date to be notified". Whether commencement notifications have since issued could not be confirmed and is marked **(TBC)** throughout. The interim administrative measure under Instruction 06/2025-GST is what actually operates for IDS provisional refunds.
2. **57th GST Council.** As at the date of writing it appears not to have concluded; any of its recommendations would supersede parts of this document.
3. **State-level variation.** SGST Acts mirror the CGST Act, but State amendments (particularly to Section 54(6)) follow the Centre with a lag, and State-level administrative practice varies. This document states the **Central** position.
4. **Portal behaviour.** Statement formats, category names, validations and utility versions change frequently and without legislative change. Everything described as *Portal* should be verified against the live GST portal before being encoded.
5. **Litigated positions.** Several important questions — retrospectivity of the amended Rule 89(5) formula, the "same goods at different rates" question, the vires and reach of Rule 96B, and whether the two-year limitation is directory for pre-deposit refunds — remain contested. Both positions are stated where relevant; neither should be hard-coded as settled.
6. **Verification gaps.** Where a very recent change was available only from professional commentary rather than the primary notification or advisory text, that is noted. Primary sources should be consulted before any operational or advisory use.

---

*This document is a research and documentation output. It is not legal or tax advice, and no reliance should be placed on it for filing any specific refund claim.*
