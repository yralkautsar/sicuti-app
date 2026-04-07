# SiCuti --- System Architecture

## 1. Introduction

SiCuti is a web‑based attendance and leave management system developed
for TK Karakter Mutiara Bunda Bali. The application focuses on
digitizing several operational routines that are usually handled
manually in schools. These include student attendance, teacher
attendance, leave requests, and school calendar management.

The architecture intentionally prioritizes simplicity and reliability.
The system is designed so that a small team can maintain it without
requiring complex infrastructure.

The core principle of the architecture is straightforward: the browser
communicates with a Next.js application, which in turn interacts with
Supabase as the backend service.

## 2. High Level Architecture

At a high level, the system consists of three primary layers.

1.  The user interface built with Next.js
2.  A lightweight server layer handled by Next.js route handlers
3.  Supabase as the backend platform that provides the database,
    authentication, and security policies

The flow of a typical request follows this path:

Browser → Next.js application → Supabase database

Users interact with the application through a browser. Requests are
handled by the Next.js application which manages routing, server logic,
and data fetching. The application then communicates with Supabase to
read or write data.

## 3. Core Application Components

The application can be understood through several core functional
modules.

### Attendance Scanning

Attendance is recorded through QR code scanning. Each student and
teacher receives a unique QR code. When a code is scanned, the system
determines whether the scan belongs to a student or a teacher and
records the attendance event.

The scanning process follows a simple flow.

The camera scans a QR code.\
The code is interpreted by the application.\
The application sends a request to record attendance.\
Supabase stores the attendance record.

This approach allows attendance to be recorded quickly without requiring
manual input.

### Administrative Dashboard

The dashboard provides administrators and teachers with operational
visibility. The main page highlights which students have not yet arrived
and summarizes attendance activity for the current day.

Administrative pages allow the user to manage students, teachers, and
classes. Reports can also be generated from this interface.

### Leave Management

Teachers can submit leave requests through the dashboard. Each request
includes the leave type, date range, and reason.

Administrators review the request and decide whether to approve or
reject it. Once a decision is made, the request status is updated and
stored in the database.

### School Calendar

The calendar module provides visibility into school activities and
holidays. Events can be entered by administrators and optionally
displayed publicly so that parents can view upcoming activities.

## 4. Deployment Architecture

The system is deployed using a modern serverless model.

The application itself runs on Vercel. This platform handles the
deployment of the Next.js application and automatically manages scaling.

Supabase provides the backend services. It includes a managed PostgreSQL
database, authentication services, and row‑level security policies.

The repository is hosted on GitHub. Changes are typically developed in a
development branch and tested in a staging environment before being
merged into the main production branch.

## 5. Design Considerations

Several design choices were made to keep the system practical for a
school environment.

The architecture avoids unnecessary complexity. A single application
handles both the user interface and server logic.

Supabase reduces the need for a custom backend by providing
authentication, database hosting, and access control.

Finally, the system is structured so that it can be extended in the
future. Features such as notifications, additional reports, or
integrations with messaging services can be added without changing the
core architecture.
