# Forms

A Typeform-class form builder. Three types share one builder: **form**
(collect responses), **quiz** (scored or outcome-mapped), **signup**
(newsletter opt-in with source tracking).

## Fields

23 field kinds across six groups — Text (short/long/number/date), Contact
(email/phone), Choice (select/radio/checkboxes/yes-no/picture), Rating
(stars/scale/NPS/ranking), Advanced (file/signature/payment), and Screens
(welcome/statement/ending/heading/paragraph). Each field has required,
help, placeholder, options, and validation (pattern/min/max) as relevant.

## Building & embedding

Build in **Admin → Content → Forms** (tabs: Build, Design, Settings, Share,
Results). Drop a form onto any page with the `form` block (embed by id).
Design offers five themes and a classic or conversational (one-question-per-
screen) layout.

## Submissions

Every submission is:

1. **Honeypot-checked** — a hidden field a bot fills; if filled, the
   submission is silently accepted and dropped.
2. **Rate-limited** per form + IP.
3. **Validated server-side** against the form's *own* field definitions —
   unknown fields are rejected, required/pattern/max enforced. The client
   shape is never trusted.
4. **Stored** and routed into People per `storeIn` (contacts→lead,
   subscribers→subscriber with opt-in, …), with an activity entry.
5. **Notified** to the owner (console email adapter by default) if enabled.

Quizzes compute a score or map answers to an outcome.

## Fit it to your cause

- **Lead capture**: a form with `storeIn: leads` and a tag-on-submit.
- **Newsletter**: a signup form (double opt-in) — feeds the mailing list.
- **Assessment/quiz**: outcome-mapped questions with a result screen.

## FAQ

**Can I collect payments in a form?** The payment field kind is a stub in
this build (renders, doesn't charge). Use the commerce checkout or a paid
booking for real payments.

**Where do file uploads go?** File is a presence-validated stub here — no
unrestricted upload path. Wire it to the media adapter to enable real
uploads.
