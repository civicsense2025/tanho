# profile-header

The home hero — bound to the singleton **profile**. Renders the avatar
(image or initials fallback), the name in the display face, and the bio as a
muted paragraph capped at 40rem. `resolve()` reads `getProfile()` and turns
`avatarMediaId` into a public URL; the editor canvas shows a placeholder
because bound blocks never resolve on the client.

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `"profile"` | Fixed — the block is bound to the profile singleton |

```json
{ "source": "profile" }
```
