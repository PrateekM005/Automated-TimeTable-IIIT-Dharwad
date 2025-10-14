# Automated Timetable for IIIT Dharwad

<p align="center">
  <img src="assets/logo.png" width="200" />
</p>

**Automated Timetable for IIIT Dharwad** automatically generates conflict-free, readable timetables using course, faculty, room, student, and exam inputs — following departmental constraints and the project requirements.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Tech Stack](#tech-stack)
* [Key Features](#key-features)
* [Inputs / Data Format (JSON examples)](#inputs--data-format-json-examples)
* [Functional & Non-Functional Requirements Mapping](#functional--non-functional-requirements-mapping)
* [Architecture & Flow](#architecture--flow)
* [Installation & Quick Start](#installation--quick-start)
* [Usage Examples](#usage-examples)
* [Folder Structure](#folder-structure)
* [Testing & Validation](#testing--validation)
* [Roadmap](#roadmap)
* [API Endpoints](#api-endpoints)
* [Contributing](#contributing)
* [License & Credits](#license--credits)
* [Acknowledgements](#acknowledgements)
* [Contact](#contact)

---

## Project Overview

This project is an automated scheduling system for IIIT Dharwad that:

* Creates class timetables and exam schedules from the provided inputs.
* Enforces hard constraints (no overlapping classes, faculty availability, room capacity).
* Prioritizes soft constraints (3-hour gap for faculty, same-day labs+lectures).
* Produces a color-coded timetable UI and can export/sync to Google Calendar.

---

## 🛠️ Tech Stack

* **Frontend:** Streamlit
* **Backend & Core Logic:** Python
* **Optimization Engine:** Google OR-Tools (CP-SAT Solver)
* **Data Handling:** Pandas
* **Input/Output Format:** CSV & Excel (.xlsx)


---

## Key Features

* Lecture slot limit: max **one lecture per day per course**.
* 10-minute refresh breaks after each class.
* Lunch break aligned with mess timings.
* Color coding for each course.
* Lab sessions scheduled on the **same day** as the course lecture.
* Electives scheduled in a common slot across departments.
* Self-study blocks allocation.
* Professor and room availability tracker.
* Rescheduling support when faculty/room becomes unavailable.
* Export to CSV / PDF and sync with Google Calendar.

---

## Inputs & Data Format (JSON examples)

### Courses (courses.json)

```json
[
  {
    "Course Code": "CS101",
    "Course Name": "Data Structures",
    "Semester": 3,
    "Department": "CSE",
    "LTPSC": {"L": 3, "T": 1, "P": 2, "S": 0, "C": 6},
    "Credits": 6,
    "Instructor": "Dr. A. Sharma",
    "Registered Students": 120,
    "Elective": "No",
    "Half Semester": "No"
  }
]
```

### Faculty (faculty.json)

```json
[
  {
    "Faculty Name": "Dr. A. Sharma",
    "Available Days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "Unavailable Time Slots": ["Mon 14:00-16:00", "Thu 09:00-10:00"]
  }
]
```

### Rooms (rooms.json)

```json
[
  {
    "Room Number": "B-101",
    "Type": "Classroom",
    "Capacity": 120,
    "Facilities": ["Projector","AC","Computers"]
  }
]
```

### Students (students.json)

```json
[
  {
    "Student Roll Number": "17CS1001",
    "Name": "Prateek Mitra",
    "Department": "CSE",
    "Semester": 3,
    "Enrolled Courses": ["CS101;CS102;HS101"],
    "Group": "A",
    "Special Accommodation": "None"
  }
]
```

### Exams (exams.json)

```json
[
  {
    "Course Code": "CS101",
    "Exam Type": "Theory",
    "Exam Duration (minutes)": 180,
    "Preferred Exam Date": "2025-12-05",
    "Alternate Exam Date": "2025-12-08"
  }
]
```

### Invigilators (invigilators.json)

```json
[
  {
    "Invigilator Name": "Prof. R. Kumar",
    "Available Days": ["Mon", "Tue", "Wed", "Thu"],
    "Unavailable Time Slots": ["Wed 15:00-18:00"]
  }
]
```

---

## Functional & Non-Functional Requirements Mapping

**Functional**

* Lecture Slot Limit → ≤1 lecture/day/course.
* Short Breaks (10-min) → After each class.
* Lunch Break → Configurable.
* Lab scheduling same-day → `lab_day(course) == lecture_day(course)`.
* Electives common slot → Pre-chosen time window.
* Track availability → Faculty and room inputs considered.
* Rescheduling → Local repair heuristics applied.

**Non-Functional**

* Usability → User-friendly, role-based UI.
* Performance → Scheduler runs within seconds.
* Scalability → Modular + DB-backed for multiple departments.
* Reliability → Conflict-free generation.
* Maintainability → Editable config rules.
* Accessibility → Responsive UI.
* Security → Role-based auth, sensitive data protection.
* Portability → Runs on Windows/Linux/macOS.
* Backup & Recovery → Automatic DB and export backups.

---

## Architecture & Flow

1. **Input Layer** — JSON/CSV upload + manual forms.
2. **Preprocessor** — Validates inputs, expands LTPSC.
3. **Constraint Engine** — Hard & soft constraints.
4. **Scheduler** — Greedy + local search / repair algorithm.
5. **Renderer** — Color-coded timetable + exports.
6. **Sync Module** — Google Calendar / iCal.
7. **Audit & Logs** — Tracks changes and versioning.

---

## Installation & Quick Start

```bash
# Clone repo
git clone https://github.com/<your-org>/automated-timetable-iiit-dharwad.git
cd automated-timetable-iiit-dharwad

# Server
cd server
npm install
npm run dev   # http://localhost:5000

# Client
cd ../client
npm install
npm start     # http://localhost:3000
```

Populate `data/` with JSONs and upload via UI or API call:

```bash
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d @data/courses.json
```

---

## Usage Examples

* Upload JSON files via Admin → Data Upload.
* Click **Generate Timetable**.
* Export: **PDF**, **CSV**, **Google Calendar**.

---

## Folder Structure

```
├── client/        # React frontend
├── server/        # Node.js backend
├── data/          # Input JSONs
├── docs/          # Documentation & diagrams
├── tests/         # Unit tests
└── README.md
```

---

## Testing & Validation

* Unit tests for constraints.
* Integration tests: small vs large dataset.
* Validate: no overlaps, capacity respected, ≤1 lecture/day.

---

## Roadmap

* [x] Core scheduling engine
* [x] UI for uploading inputs
* [ ] Google Calendar integration
* [ ] Mobile responsive design

---

## API Endpoints

* `POST /api/generate` → Generate timetable
* `GET /api/timetable/:semester` → Fetch timetable
* `POST /api/exams` → Schedule exams

---

## Contributing

1. Fork repo.
2. Create branch `feature/<your-feature>`.
3. Make changes & add tests.
4. Open PR with description & linked issue.
5. At least 1 reviewer approval.

---

## License & Credits

MIT License. Team members: *Add team names here*. Include external library licenses.

---

## Acknowledgements

* OR-tools / Constraint Solver libraries
* IIIT Dharwad for project guidelines
* Open-source React, Node.js, TailwindCSS docs

---

## Contact

**Team Lead:** Prateek Mitra — [email@example.com](mailto:email@example.com)
**Repo:** `https://github.com/<your-org>/automated-timetable-iiit-dharwad`
