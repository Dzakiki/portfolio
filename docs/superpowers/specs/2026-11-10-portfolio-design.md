# Portfolio website: design spec

Date: 2026-11-10
Owner: Ahmad Dzaki
Status: draft for review
Reference prototype: `docs/prototype/prototype.html` (throwaway; approved for look and motion, not for code reuse)

## 1. Purpose

A personal portfolio for Ahmad Dzaki, a third-year Software Engineering student at SMU with a backend focus. Its job is to make a visitor stop and look, then let them find his projects and contact details.

**Priority order, decided with the owner:**

1. Visual impact. The site should produce a "woah" on arrival. Some speed of access is traded for this.
2. Readability. Everything a visitor reads is set in a normal typeface at comfortable size and contrast.
3. Speed for recruiters. Kept through skip controls and deep links, not by toning the experience down.

## 2. Concept

A gothic cathedral rendered entirely in ASCII characters, which the visitor passes through to reach an inventory screen modelled on a dark-fantasy game menu. Projects are "relics" held in that inventory.

The mood borrows from Bloodborne, Dark Souls and Elden Ring: darkness, stone, engraved serif lettering, item descriptions with a line of lore. Nothing is taken from those games: no logos, fonts, artwork, names or text.

**No religious symbols.** At the owner's request, the building is gothic architecture only: no crosses anywhere, including on spires, the gable, grave markers and window tracery.

## 3. Structure

One page, three stages, in this order:

| Stage | What the visitor sees |
|---|---|
| Hero | Full-screen ASCII cathedral at night, with the name across it |
| Descent | The camera pushes through the cathedral's great door into darkness |
| Inventory | A framed menu with four tabs, in this order: Journey, Relics, Attributes, Contact |

The hero is not a gate. Scrolling, pressing Enter, Space or the down arrow, or clicking "DESCEND" all start the descent.

### Deep links

Journey comes first because it opens with the owner's introduction; it is the tab shown on arriving from the descent.

Each tab has its own URL fragment (`#journey`, `#relics`, `#attributes`, `#contact`), and each relic has one too, for example `#relics/jms`. Opening a deep link skips the entrance and descent and lands directly there. This is the fast path for a recruiter who has been sent a link.

## 4. Hero

### Scene

A real 3D world, built from geometry in code (no downloaded models), drawn very small each frame and converted to a grid of characters. Because it is true 3D, the camera can move through it, surfaces are lit by actual lights, and distant things fade into fog. It contains:

- A cathedral: two towers with spires and pinnacles, a central gable topped by a plain finial, a rose window with wheel tracery, a gallery of small arches, three pointed-arch doors, buttresses and side chapels. Behind the front it is a complete building: a thirteen-bay nave with columns, arcades, a ribbed vault and side aisles, a crossing with two transepts ending in wheel windows, and an apse with a great three-light window and a fire bowl before it.
- An iron fence in the foreground, which shifts against the building as the pointer moves.
- A large moon behind the left spire, partly hidden by it.
- A graveyard of headstones and obelisks to both sides, two bare trees, and a sparse field of stars.
- Ground fog that drifts along the bottom rows.

Additions beyond the prototype, to raise the scale (owner asked for "grander"):

- **The cathedral is taller than the screen.** The full facade is about 1.6 viewport heights, so it is never seen whole until the camera has travelled down it.
- **A city behind it.** A far skyline of smaller spires, roofs and chimneys in the dimmest brightness step, spanning the full width.
- **Clouds** that drift slowly across the moon, dimming and revealing it.
- **Depth on mouse movement.** The camera itself shifts slightly with the pointer (about 1.3 m sideways, 0.6 m vertically), so near things move against far things as they would in life.
- **Windows that light.** Every window starts dark and ignites as the reveal front passes it, the rose window last.
- **Crows.** A flock of about 20 small character-birds lifts off the spires and crosses the sky when the name lands, then a few circle at intervals.
- **Light from the rose window.** Faint rays fan downward from it and sway slowly.

Characters come from the ramp ` .:-=+*#%@` only, so brightness maps to character density. Stone is given a faint random grain so filled areas don't look flat.

**Outlines.** Evenly lit stone would turn into flat fields of one character. So the world is drawn a second time showing only which way each surface faces; wherever neighbouring cells face different ways, or stone meets sky, that cell is brightened. This draws every edge, arch and column as a bright line, which is what makes the architecture read.

### Entrance sequence

Plays once per visit, about 8 seconds: a refresh, or a return in the same browser tab, goes straight to the finished hero. While it plays, a small "PRESS ANY KEY TO SKIP" line ("TAP TO SKIP" on touch screens) sits at the bottom. The camera starts high and cranes down the building.

| Time | Event |
|---|---|
| 0.0 to 0.8 s | Black screen with thin streams of falling characters |
| 0.8 to 2.5 s | The moon and clouds resolve; the camera is level with the spire tips, which are carved out of the falling characters against the moon |
| 2.5 to 6.5 s | The camera travels down the facade while the reveal front runs ahead of it; windows ignite as it passes; the skyline appears behind |
| 6.5 s | The camera settles on the resting view (rose window in the upper third, doors at the bottom). The rose window lights, its rays fan out, the crows lift |
| 6.8 s | The name fades in while its letter spacing tightens from very wide to its resting width; a thin rule draws outward beneath it |
| about 7.9 s | The subtitle appears |
| about 8.7 s | The "DESCEND" prompt appears |

After the entrance the camera never fully stops: it pushes in by about 4% over 40 seconds, then holds.

**There are no full-screen flashes anywhere on the site.** The prototype's inversion flash was removed at the owner's request and must not return in any form.

Any key press, click, touch or scroll during the entrance completes it immediately.

### Ambient motion

- Ash particles drift slowly down and to the left.
- The rose window flickers like candlelight.
- The cursor acts as a lantern: the scene is slightly dim overall and brightens in a soft circle around the pointer. With no pointer (touch devices), the lantern rests on the rose window.

### Text

- Name: `AHMAD DZAKI`, Cormorant Garamond 600, about 6.5% of viewport width, positioned at roughly 65% of viewport height.
- Subtitle: `SOFTWARE ENGINEERING STUDENT · SINGAPORE MANAGEMENT UNIVERSITY`, JetBrains Mono, wide letter spacing.
- Tagline: one optional line in italic serif under the subtitle, from `src/data/about.ts`.
- The band of scene behind the name, subtitle and tagline is dimmed by about half so they stay readable.

A longer optional introduction from the same file, a few short paragraphs opening with a large initial letter, appears at the top of the Journey tab. The text is adapted from the owner's earlier site.

## 5. Descent

Driven by scroll position across four viewport heights, so the visitor controls the pace. Pressing Enter, Space, down arrow or the prompt plays it automatically over about 7 seconds; any wheel or touch input cancels the automatic play and hands control back.

It is one continuous walk through the real building, with no cut:

**To the door** (first 35% of the scroll). The camera leaves the resting view, lowers to walking height and walks straight up to the great door, which grows until it fills the view. The name scales up and fades out at the start. The candle-lit nave is visible through the doorway as it approaches.

**Down the nave** (the remaining 65%). The camera passes through the door and travels the nave at eye level with a slight walking bob. Columns, arcade arches and vault ribs pass on both sides and overhead; candles flicker on the columns and light the stone near them, with darkness between. The great window at the far end grows steadily. Crossing the threshold, the moonlight dies away and the air thickens.

**Arrival.** The walk ends at the crossing, facing the great window, exactly where the inventory view begins, so the inventory fades in over the same picture with no jump.

Scrolling back up reverses the walk.

## 6. Inventory

### Title card

Each tab announces itself: the tab name in large Cormorant Garamond with letter spacing that tightens as it fades in, and a rule drawing outward on both sides of a small plain-language label.

| Tab | Label under the title |
|---|---|
| RELICS | PROJECTS |
| JOURNEY | EXPERIENCE AND EDUCATION |
| ATTRIBUTES | SKILLS |
| CONTACT | GET IN TOUCH |

The themed name never appears without its plain label. The first title card takes about 2 seconds; switching tabs afterwards uses a shorter version of about 0.8 seconds.

### The chamber

The inventory is shown from the crossing of the cathedral, the real place the walk ends. The 3D view stays live behind every tab, and **each tab turns the camera to face a different part of the building**, taking about a second and a half:

| Tab | The camera faces |
|---|---|
| Journey | The great window and the fire bowl |
| Relics | The left transept and its wheel window |
| Attributes | The right transept and its wheel window |
| Contact | Back down the whole nave, to the door |

The pointer shifts the view slightly. The view is dimmed behind the tab's title and drawn with fainter outlines than outdoors, so the text in front stays the brightest thing on screen. Once the inventory is open the view is redrawn at half the frame rate.

### The tab bar

The tabs are the way around the site, so they must be impossible to miss: a solid black bar with a bone border, bone text, and the current tab inverted (bone background, black text). It stays fixed near the top of the screen while the inventory scrolls.

### Frame

A double-ruled bone frame with a diamond ornament at the top and bottom centre, up to 1240 px wide, on a near-opaque black panel. Each corner carries an ASCII filigree ornament. When a tab is shown its frame opens from the centre outward, like a pair of doors, over one second.

### Relics tab

A reliquary: one large stage, the selected project's text beside it, and four alcoves beneath.

**The stage** is 120 by 72 small characters, redrawn twenty times a second. It shows:

- the project's relic as a real 3D object, floating and gently bobbing above a two-tier stone plinth, swaying from side to side so its front always shows;
- dark surfaces with brightly traced outlines and bright accents (eye rings, rims, studs), which is what lets a face or a pot be recognised in characters; hollows such as eye holes stay empty;
- a shaft of light falling from above, widening toward the plinth and shimmering;
- embers drifting upward through the light.

Moving the pointer across the stage turns the relic, up to nearly all the way round; it eases back when the pointer leaves.

**Changing project:** the relic on the stage dissolves into scattered characters over about 0.4 seconds, then the new one assembles over one second.

**The text** beside the stage: a small "RELIC II OF IV" line, the full project name, stack line, two or three bullet points, a lore line in italics under a rule, then links if any exist.

**The alcoves:** four arched niches in a row, each holding a small still rendering of its relic, the project's short name and its lead technology. The selected alcove is inverted (bone background). They sit beneath the stage so the stage is the first thing seen; without JavaScript they come first and act as a list of links.

Each relic stands for something about its project, and says so. The text beside the stage names it ("RELIC I OF IV · THE CAULDRON") with a short line on why it fits. The object, its name and that line are set in the project's content file.

| Project | Object | Why |
|---|---|---|
| JMS | cauldron | For the meals it saves. |
| Brainrot LMS | tome | A learning platform is made of lessons. |
| TutorGuru | owl | The old emblem of a teacher. |
| CS102 Attendance | mask | It knows a student by their face. |

Relics are built from 3D shapes in code (`src/scripts/scene3d/relics.ts`), drawn with the same renderer and outline method as the cathedral.

**Choosing a project does not move the page.** Only changing tab returns to the top of the section.

### Journey tab

A single pane showing all four entries at once as a timeline: large year numerals on the left, a vertical line with a diamond at each entry, and the role, place, dates and bullet points on the right. Entries rise into place one after another when the tab opens.

### Attributes tab

Everything is visible at once; nothing has to be clicked.

- Right: tiles grouped by Languages, Frameworks and Tools, Cloud and DevOps, Databases. Each tile shows the technology's logo in a single colour (bone, never brand colours), its name, and links to the relics and journey entries where it was used. The links are omitted when the résumé names no project for it.
- Logos come from the Simple Icons set (CC0). Technologies with no logo in that set (SQL, PL/SQL, REST APIs, Oracle APEX, AWS, Azure) show letters instead. Java uses the OpenJDK mark.
- Left: one large ASCII rendering of a logo, with its name beneath. It cycles through every technology on its own, about every three seconds, and the matching tile is highlighted. Hovering or focusing a tile shows that one and holds it.
- Beneath: Concepts and Certifications as plain text lists.

**No skill bars, percentages, levels or star ratings.** Evidence replaces self-rating.

### Contact tab

A single pane with email, LinkedIn, GitHub and a résumé download in large serif, beside a 3D ASCII bell that rocks from its beam. No contact form. The phone number is not shown on the site.

### Navigation

| Input | Action |
|---|---|
| Click or tap | Select tab or item |
| Left and right arrows | Previous and next tab |
| Pointer across the Relics stage | Turns the relic |
| Up and down arrows | Previous and next project, on the Relics tab |
| Tab key | Moves through tabs, list items and links in order, with a visible focus ring |

## 7. Content

Taken from the résumé dated 16 Oct 2026. Bullet wording may be tightened but facts must not change.

### Relics

| Short name | Full name | Stack line | Points |
|---|---|---|---|
| JMS | Just Meal Savers | Keycloak · Temporal · Microservices | Keycloak authentication, RBAC and route protection across frontend and backend services. Refund service built on Temporal workflows to manage distributed transaction states. |
| Brainrot LMS | CS203 Brainrot LMS | Keycloak · RBAC · Integration testing | End-to-end Keycloak authentication and RBAC for user profiles and role assignments. Kanban-style lesson board for contributor workflows, with end-to-end integration testing. |
| TutorGuru | TutorGuru | Vue.js · Firebase · Firestore | Main parent-to-tutor flow: posting assignments, tutors applying from the dashboard or map, parents picking a tutor. Migration from dummy data to Firestore; filtering, pagination, dark mode, email reminders. |
| CS102 Attendance | CS102 Attendance Taking | Spring Boot · REST · Face recognition | Student management backend: Student/User entity model, repository and database layer. REST APIs for course enrolment and checks on uploaded face images. |

### Journey

| Entry | Detail |
|---|---|
| Oracle, Backend Developer Intern, Apr 2023 to Mar 2024 | Five enterprise applications in Oracle APEX and PL/SQL. Relational schema design and complex SQL. REST APIs and JSON integrations automating file-processing workflows, improving turnaround by about 30%. Two full development lifecycles through Oracle's CSSAP security process. |
| SMU, BSc Software Engineering, Aug 2024 to Jun 2028 (expected) | GPA 3.8/4.0. Dean's List AY2024/25 and AY2025/26. |
| Republic Polytechnic, Diploma in Information Technology, 2021 to 2024 | GPA 3.9/4.0. |
| SMU Rotaract (Project Candela), Logistics and Programmes, Sep 2024 to Jun 2025 | Logistics for 12+ community outreach events; 5-member committee; 20 volunteers. |

### Attributes: evidence the résumé supports

| Skill | Used in |
|---|---|
| Spring Boot, REST APIs | CS102 Attendance |
| Keycloak | JMS, Brainrot LMS |
| Temporal, Microservices | JMS |
| Vue.js, Firebase, Firestore | TutorGuru |
| SQL, PL/SQL, Oracle APEX, REST APIs | Oracle |

Java, Python, JavaScript, Flask, Docker, AWS, Azure, GitHub Actions, PostgreSQL and MySQL are on the résumé without a named project. They are listed without a "used in" link until the owner supplies one (see section 13).

## 8. Visual system

### Colour: "Bone"

One hue family, no accent colour. Emphasis comes from inversion, size and brightness.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0A0A0A` | Page background |
| `--bone` | `#E4DFD3` | Text, rules, selected-item fill, ASCII characters |
| `--dim` | `#8A867D` | Secondary text, labels, lore |
| `--line` | `#3A3833` | Hairlines and inner frame |

ASCII characters are drawn in bone at four opacity steps: 0.36, 0.58, 0.80, 1.00.

### Type

| Role | Face | Notes |
|---|---|---|
| Display | Cormorant Garamond 500 and 600 | Name, title cards, relic names |
| Reading | EB Garamond, regular and italic | Bullets at 21 px, lore at 19.5 px italic |
| Mono | JetBrains Mono 400 and 500 | ASCII art, labels, stack lines, tabs; always uppercase with wide letter spacing when used for labels |

Fonts are self-hosted, not loaded from a third-party server.

### ASCII rules

- ASCII is used for imagery and ornament only. Nothing a visitor needs to read is rendered as ASCII art.
- All ASCII art is hidden from screen readers.

## 9. Motion rules

- Easing for reveals: `cubic-bezier(.16, .8, .2, 1)`.
- No full-screen flashes, strobing or rapid inversion.
- Every timed sequence can be cut short by any input.
- Text is readable from the moment it appears; no letter-by-letter typing of readable content.
- With "reduce motion" set in the operating system: the entrance is skipped, crows, clouds and parallax are off, ash and flicker are off, the descent is a plain cross-fade, relics and logos appear fully formed and still, and text appears without delay.

### Sound

Off by default. A small `SOUND: OFF` toggle sits in the top-right corner; the choice is remembered for the visit only.

When on: low wind throughout, one deep bell toll as the name lands, a muffled stone-door thud when entering the nave, and a soft chime on selecting a relic. All sound is synthesised in the browser with the Web Audio API, so there are no audio files to license or download. Master volume is capped low and there are no sudden loud onsets.

## 10. Accessibility and fallbacks

- All content exists as real HTML with headings, lists and links, in reading order, independent of the canvas.
- Without JavaScript the visitor sees a static image of the cathedral followed by all four sections stacked as a normal page.
- Text contrast: bone on background is about 15:1; dim on background is about 5.5:1. Both pass WCAG AA.
- Narrow screens (under 820 px): the list sits above the detail pane, the relic is centred above the text, the timeline and attribute tiles stack in one column, and the ASCII grid uses a smaller character size.
- The animation loop pauses when the browser tab is hidden.

## 11. Performance

- Target: 60 frames per second on a mid-range laptop at 1920×1080; never below 30.
- The 3D world is drawn at one pixel per character cell (about 320 by 85 on a desktop), so the graphics card does very little work.
- The picture is fetched back from the graphics card without stalling the page: the lit view and the outline view share one target and one read, and the read is asynchronous.
- The character grid is drawn on the graphics card too: a small texture says which glyph and how bright for each cell, and a shader stamps glyphs from an atlas. Measured in the test browser, this took drawing from 5 to 11 ms a frame down to under 0.5 ms.
- Once the entrance is over and the camera is at rest before the facade, the view is redrawn at half the frame rate.
- Device pixel ratio is capped at 2.
- If average frame time over one second exceeds 24 ms, the character size steps up one notch to reduce the cell count.
- At the crossing the view is redrawn at half the frame rate.
- The 3D library (three.js) brings the JavaScript to about 160 KB compressed. This was accepted in exchange for a real 3D world.
- Without WebGL the site still works: the hero shows the still poster image and all content is reachable.

## 12. Build

- **Framework:** Astro, static output.
- **Content:** one Markdown file per relic and per journey entry, with front matter for name, stack, links and which relic object to show. Adding a project means adding a file.
- **Hosting:** GitHub Pages, deployed by a GitHub Actions workflow on push to `main`.

Code is split into units with one job each:

| Unit | Job |
|---|---|
| `scene3d/build` | Builds the whole world as 3D geometry: cathedral inside and out, grounds, sky, lights |
| `scene3d/path` | The camera path: entrance, walk to the door, nave, and the view for each tab |
| `scene3d/world` | Draws the world small, twice per frame (lit view, and surface directions for outlines) |
| `audio` | Synthesises wind, bell, door and chime; silent unless the toggle is on |
| `renderer` | Converts the rasterised scene to rows of characters and paints them |
| `effects` | Outlines, entrance reveal, rain, ash, crows, lantern; each a function over the brightness grid |
| `timeline` | Owns entrance time and descent progress; the only unit that reads scroll and input |
| `relic3d` | Renders and turns a project's 3D object as characters |
| `altar` | Cycles the large ASCII logo on the Attributes tab |
| `inventory` | Tabs, list selection, keyboard handling, URL fragments |

### Testing

- Unit tests for `relic3d` (same shape and angle give the same grid) and for the `timeline` mapping from scroll position to descent progress.
- Screenshot checks of four fixed states (mid-entrance, hero at rest, mid-descent, inventory) at 1600×900 and 390×844.
- Manual pass with keyboard only, with reduced motion on, and with JavaScript off.

### Sharing and stray addresses

- The page carries Open Graph and Twitter card tags, with a 1200 by 630 image of the hero (`public/og.png`), so a pasted link shows a picture, title and description.
- A tab icon (`public/favicon.svg`): a pointed arch in bone on black.
- A not-found page in the same style, with a link back.

Both images are regenerated with `npm run poster`.

### Security and privacy

- The site is static: no server code, accounts, forms, cookies, analytics or stored data, and no requests to any other site.
- Every page carries a Content Security Policy allowing content from this site only, with one hashed inline script. Fonts and other assets ship as files, never embedded as data URLs, so the policy needs no exceptions for them.
- Links that leave the site carry `rel="noopener noreferrer"`.
- Build tools are kept on current major versions; the deploy workflow runs the tests and a dependency audit before publishing.
- The repository is public, so it holds nothing personal beyond what the site shows. The phone number appears in no source, test or document; a check asserts no phone number reaches the page.
- The site address is configurable (`SITE_URL`, `BASE_PATH`), and the checks are run against a production build in both the default and the custom-domain configuration.

## 13. Open items for the owner

1. Do any of the four projects have a public repository or live demo to link?
2. Lore lines, and the tagline and bio in `src/data/about.ts`, are drafts. Write your own, or approve them?
3. Which email address goes on the Contact tab?
4. Should the downloadable résumé include your phone number?
5. Where did you use Java, Python, Flask, Docker, AWS, Azure, GitHub Actions, PostgreSQL and MySQL? (For the Attributes tab.)
6. Custom domain, or the default GitHub Pages address?
7. Add the gym workout app as a fifth relic?

None of these block the build; each has a working default (no links, placeholder lore marked for replacement, SMU email, résumé as-is, skills listed without links, default address, four relics).

## 14. Not in the first build

- The ASCII world map as a second way to navigate.
- A blog or writing section.
- A light theme.
- Per-project screenshots or galleries.

## 15. Done when

- The entrance, descent and inventory behave as described at 1920×1080 and on a phone.
- All four tabs hold the content in section 7.
- Every relic and tab is reachable by keyboard and by its own URL.
- A deep link lands on its item without playing the entrance.
- No full-screen flash occurs at any point.
- Reduced-motion and no-JavaScript visitors can read everything.
- The site is live on GitHub Pages.
