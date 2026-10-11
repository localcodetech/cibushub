# Real-time events (Socket.IO)

Events are only nudges: screens refetch the REST API, which stays the source of truth (AC-RT-03).
Emits happen after the database transaction commits. Rooms are joined automatically on connect
(`user:<id>`, `restaurant:<id>` for owners, `admins`), except `order:<id>`, which a screen asks
to join and the server checks (AC-RT-02).

| Event | Room | Sent when | Carries |
|---|---|---|---|
| `order:updated` | `order:<id>`, `restaurant:<id>`, `user:<customer>`, `admins` | Any order status change | orderId, orderNumber, status, fromStatus, at |
| `order:delay` | `user:<customer>` | No rider found after 10 minutes | orderId |
| `rider:location` | `order:<id>` | Each accepted rider location (~every 5 s), only while the order is `RIDER_ASSIGNED` or `PICKED_UP` (AC-RT-04, AC-RT-09) | orderId, latitude, longitude, at |
| `delivery:offer` | `user:<rider>` | A delivery is offered (60 s) | the offer view, with secondsLeft |
| `delivery:assigned` | `user:<rider>` | An admin gives the rider an order | orderId, deliveryId |
| `delivery:unassigned` | `user:<rider>` | The rider was taken off, or the order was cancelled | orderId, reason |
| `delivery:ready` | `user:<rider>` | The kitchen marked the food ready | orderId |
| `delivery:code-unlocked` | `user:<rider>` | An admin unlocked the delivery code | orderId |
| `delivery:completed` | `user:<rider>` | The customer confirmed receipt after the code locked | orderId, confirmedBy |
| `delivery:problem` | `user:<customer>` | The rider reported a problem at the door; they wait until waitEndsAt | orderId, problemType, waitEndsAt |
| `delivery:returning` | `user:<rider>` | Nobody took the food (or an admin cancelled after pickup): take it back | orderId, reason |
| `order:returning` | `restaurant:<id>` | The rider is bringing an order's food back | orderId, orderNumber |
| `order:returned` | `restaurant:<id>` | The rider confirmed the food is back | orderId |
| `rider:status` | `user:<rider>` | The server took the rider offline (no location for 5 minutes) | isOnline, reason |
| `admin:alert` | `admins` | Something needs an admin (applications, flagged pickups, locked codes and codes still locked after 15 minutes, door problems, food returning, flagged returns, slow searches, emails/SMS that failed for good) | type and details |

Sent by the phone:

| Event | Who | Answer (acknowledgement) |
|---|---|---|
| `order:join`, `order:leave` | anyone logged in | `{ ok }` |
| `rider:location` | online riders | `{ ok }` or `{ ok: false, reason: INVALID / OFFLINE / TOO_FREQUENT / IMPLAUSIBLE }` |
