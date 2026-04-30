## Goal

Import the 48 components from `No.docx` into the catalog. For each item:
- If it already exists in the catalog (matched by meaning, even if the existing name is in Hebrew), **increment** `quantity_total` and `quantity_available` by the doc's quantity.
- If it does not exist, **insert** a new row with the image extracted from the docx.

All images come from the docx itself (already extracted by the parser), uploaded to the existing public `catalog-images` storage bucket. No AI generation, no third-party URLs.

## Approach

### 1. Build a manual match map

The existing catalog is mostly in Hebrew. I'll hand-curate the mapping from each of the 48 English doc rows to either:
- an existing catalog row id (→ update quantity), or
- "NEW" (→ insert).

Examples of matches I can already see:
- "RGB LED Module" → `לד RGB (RGB LED)`
- "Active Buzzer Module" → `זמזם (Buzzer)`
- "Passive Buzzer Module" → `זמזם פסיבי (Passive buzzer)`
- "Digital Push Button Module" → `כפתור (Button)`
- "Collision Sensor" → `זעזוע (Shock)`
- "Line Tracking Sensor" → `מעקב קו (Tracking)` / `Tracking – חיישן עקיבה אחרי קו/מסלול`
- "Infrared Obstacle Avoidance Sensor" → `הימנעות ממכשולים (Avoid)` / `Avoid (חיישן מכשולים)`
- "Hall Magnetic Sensor" → `הול מגנטי (Hall magnetic)`
- "PIR Motion Sensor" → existing PIR row
- "DHT11 Temperature and Humidity Sensor" → `טמפרטורה ולחות (Temperature & humidity)`
- "LM35 Linear Temperature Sensor" → `טמפרטורה אנלוגי (Analog temperature)`
- "Joystick Module" → `מודול ג'ויסטיק` / `ג'ויסטיק (Joystick)`
- "5V 1 Channel Relay Module" → `ממסר (Relay)`
- "9G Servo Motor" → `מנוע סרוו 9g`
- "HC-SR04 Blue Ultrasonic Sensor" → `HC-SR04` / `חיישן מרחק אולטרהסוניק HC-SR04`
- "Soil Humidity Sensor" → `חיישן לחות קרקע` / `לחות אדמה (Soil Moisture)`
- "Pulse Rate Monitor Module" → `חיישן דופק לב` / `דופק (Heartbeat)`
- "Rotary Encoder Module" → `מקודד סיבובי / אנקודר (Rotary encoder)`
- "Capacitive Touch Sensor" → `מגע (Touch)`
- "Flame Sensor" → `להבה (Flame)`
- "Reed Switch Module" → `מפסק עלה (Reed switch)`
- "Water Sensor" → `מים (Water)`
- "Photo Interrupter Module" → `חסימת אור (Light blocking)`

When a doc item has multiple plausible existing matches (e.g. two reed-switch rows), I pick the closer name and only bump that one (no double counting).

Likely **NEW** inserts (no clear existing match): White LED Module, 3W LED Module, Traffic Light Module, Knock Sensor, Digital Tilt Sensor, Analog Rotation Sensor, Photocell, Analog Sound Sensor, Analog Gas Sensor, Analog Alcohol Sensor, Steam Sensor, Piezoelectric Vibration Sensor, Voltage Sensor, Thin-film Pressure Sensor, TEMT6000, GUVA-S12SD UV, IR Receiver, IR Transmitter, Magical Light Cup (already have `כוס אור`? — will match), APDS-9930, ALS Proximity, MMA8452Q, 0802 LCD, 8x8 LED Matrix.

I'll finalize the full mapping in code once the plan is approved, by re-reading the full catalog rows side-by-side with the 48 doc rows.

### 2. Upload doc images

For each of the 48 items, take its corresponding `parsed-documents://.../page_X_image_Y_v2.jpg` (per the doc), copy to `/tmp/`, then upload to bucket `catalog-images/imported/<slug>.jpg`. A few rows in the doc reference `layout_id=...` placeholders instead of a real extracted image — for those (~8 items) I'll fall back to leaving `image_url` null or using the closest extracted image; I'll log which ones if any.

### 3. Apply DB changes

Two operations, run via the insert tool (data-only, no schema change):

```sql
-- a) Bump quantities for matched items
UPDATE catalog_items SET
  quantity_total = quantity_total + <doc_qty>,
  quantity_available = quantity_available + <doc_qty>
WHERE id = '<existing_id>';

-- b) Insert new items
INSERT INTO catalog_items (name, quantity_total, quantity_available, image_url, category)
VALUES ('<English name>', <qty>, <qty>, '<public storage url>', '<category>');
```

Categories assigned per item using the existing 4 buckets (`sensors`, `tools`, `microcontrollers`, `other`). Most doc items are sensors or modules → `sensors` or `other`.

### 4. Verify

After running, query `catalog_items` and confirm:
- 48 doc items are reflected (matched rows bumped, new rows present with images).
- All new rows have non-null `image_url` pointing to the public bucket URL.

## Out of scope

- No schema changes.
- No UI changes.
- Not deleting or renaming existing rows.
- Not translating new English names to Hebrew (kept as-is from the doc; can do a Hebrew pass after if you want).

## Open question

For each doc item, if you'd prefer me to **always insert as a new row** (English-named, with the docx image) rather than bumping the existing Hebrew row, say the word and I'll switch. Default plan above is: match-and-bump where confident, insert otherwise.
