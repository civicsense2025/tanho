import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/import/csv";
import { parseSubscriberCsv } from "@/lib/import/subscribers";

describe("parseCsv", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('a,b,c\n"x,y","he said ""hi""",z\n');
    expect(rows[0]).toEqual(["a", "b", "c"]);
    expect(rows[1]).toEqual(["x,y", 'he said "hi"', "z"]);
  });

  it("tolerates a missing trailing newline", () => {
    expect(parseCsv("email\na@b.com")).toEqual([["email"], ["a@b.com"]]);
  });
});

describe("parseSubscriberCsv — per-platform mapping", () => {
  it("Substack: Email + Subscription status", () => {
    const csv = "Email,Subscription type,Subscription status\nA@Example.com,free,active\nb@example.com,paid,cancelled\n";
    const r = parseSubscriberCsv(csv);
    expect(r.platform).toBe("substack");
    expect(r.rows[0]).toEqual({ email: "a@example.com", status: "active", name: null, source: "substack" });
    expect(r.rows[1].status).toBe("unsubscribed");
  });

  it("Mailchimp: Email Address + First/Last Name", () => {
    const csv = "Email Address,First Name,Last Name,MEMBER_RATING\njane@example.com,Jane,Doe,4\n";
    const r = parseSubscriberCsv(csv);
    expect(r.platform).toBe("mailchimp");
    expect(r.rows[0].email).toBe("jane@example.com");
    expect(r.rows[0].name).toBe("Jane Doe");
  });

  it("Ghost: email + name + subscribed_to_emails boolean", () => {
    const csv = "id,email,name,subscribed_to_emails,stripe_customer_id\n1,x@example.com,Xavier,true,\n2,y@example.com,Yuki,false,\n";
    const r = parseSubscriberCsv(csv);
    expect(r.platform).toBe("ghost");
    expect(r.rows[0]).toEqual({ email: "x@example.com", status: "active", name: "Xavier", source: "ghost" });
    expect(r.rows[1].status).toBe("unsubscribed");
  });

  it("Buttondown: email + subscriber_type", () => {
    const csv = "id,email,subscriber_type,subscription_date\n1,z@example.com,regular,2026-01-01\n2,w@example.com,unsubscribed,2026-01-02\n";
    const r = parseSubscriberCsv(csv);
    expect(r.platform).toBe("buttondown");
    expect(r.rows[0].status).toBe("active");
    expect(r.rows[1].status).toBe("unsubscribed");
  });

  it("skips invalid emails and reports them", () => {
    const csv = "Email,Subscription status\nnot-an-email,active\ngood@example.com,active\n";
    const r = parseSubscriberCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].email).toBe("good@example.com");
    expect(r.skipped).toHaveLength(1);
  });

  it("de-dupes repeated emails within a file (case-insensitive)", () => {
    const csv = "email,status\nDup@Example.com,active\ndup@example.com,active\n";
    const r = parseSubscriberCsv(csv);
    expect(r.rows).toHaveLength(1);
  });

  it("defaults unknown status to pending, never silently active", () => {
    const csv = "Email,Subscription status\nq@example.com,some-weird-status\n";
    const r = parseSubscriberCsv(csv);
    expect(r.rows[0].status).toBe("pending");
  });

  it("honors an explicit platform hint over auto-detection", () => {
    const csv = "email,status\na@example.com,inactive\n";
    const r = parseSubscriberCsv(csv, "beehiiv");
    expect(r.platform).toBe("beehiiv");
    expect(r.rows[0].status).toBe("unsubscribed"); // beehiiv "inactive" → unsubscribed
  });
});
