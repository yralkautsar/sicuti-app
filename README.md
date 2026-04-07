# SiCuti

SiCuti is a small web application built to help manage attendance and
leave requests at **TK Karakter Mutiara Bunda Bali**.\
The project started as a practical solution to replace several manual
routines used in the school's daily operations.\
Instead of recording attendance on paper or tracking leave requests
informally, the school can now manage these activities through a simple
web interface.

Although the system was initially developed for internal use, the
project also serves as part of the author's engineering portfolio. The
goal of the project is not only to solve a real problem but also to
demonstrate how a small operational system can be built with a modern
web stack.

------------------------------------------------------------------------

## What the system does

The main purpose of SiCuti is to make several school activities easier
to manage.

Students and teachers can record attendance using QR codes. When a QR
code is scanned, the system immediately registers the attendance event
and stores it in the database.

Teachers are also able to submit leave requests directly from the
dashboard. Each request includes the type of leave, the date range, and
the reason. Administrators can review the request and decide whether it
should be approved or rejected.

In addition to attendance and leave management, the system provides a
small set of administrative tools. School staff can manage student
records, organize classes by academic year, and maintain a calendar of
school events.

Attendance data can also be viewed through simple reports that summarize
daily or monthly activity.

------------------------------------------------------------------------

## Technology used

The application is built using a relatively simple stack. The intention
is to keep the system maintainable while still using modern tools.

The frontend is built with **Next.js** using the App Router. Styling is
handled with **Tailwind CSS**.

Instead of building a custom backend server, the project relies on
**Supabase**. Supabase provides the PostgreSQL database, authentication
services, and access control through row level security policies.

The application itself is deployed on **Vercel**, which makes it easy to
deploy updates directly from the GitHub repository.

------------------------------------------------------------------------

## How the system is structured

At a high level, the system follows a straightforward structure.

Users interact with the application through a browser.\
The Next.js application handles routing and server logic.\
Data is stored and retrieved through Supabase.

This approach keeps the architecture simple while still allowing the
application to scale if the dataset grows over time.

------------------------------------------------------------------------

## Main features

The system currently focuses on a few core features.

Attendance can be recorded using QR codes assigned to each student and
teacher. The QR codes follow a simple pattern that allows the system to
distinguish between teachers and students.

The administrative dashboard allows staff members to view attendance
activity for the current day and quickly identify students who have not
yet arrived.

Student records can be imported from CSV files or entered manually.
Classes are organized by academic year so that the same class names can
be reused without mixing historical data.

Teachers can submit leave requests, and administrators can review and
update the request status from the dashboard.

The system also includes a simple calendar that displays school events
and holidays. Some events can be made visible to parents through a
public page.

------------------------------------------------------------------------

## Running the project locally

To run the project locally you will need Node.js installed.

After cloning the repository, install the project dependencies:

npm install

Once the dependencies are installed, start the development server:

npm run dev

The application should then be available at:

http://localhost:3000

------------------------------------------------------------------------

## Environment configuration

The application requires Supabase credentials to connect to the
database.

Create a `.env.local` file in the root directory and add the following
variables:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url\
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

Once these variables are configured, the application should be able to
communicate with the Supabase backend.

------------------------------------------------------------------------

## Deployment

The production deployment is handled by Vercel.

The repository uses a simple workflow where development changes are
tested in a staging environment before being merged into the main
production branch.

Production: https://sicuti-app.vercel.app

Staging: https://sicuti-staging.vercel.app

------------------------------------------------------------------------

## Project status

The core system is already functional and has been tested with real data
structures from the school.\
Several improvements are planned for future iterations, including
attendance correction tools, notification integrations, and additional
reporting features.

------------------------------------------------------------------------

## Repository

Source code:\
https://github.com/yralkautsar/sicuti-app

------------------------------------------------------------------------

## Notes

SiCuti was designed to remain intentionally simple.\
The goal of the project is not to build an overly complex system, but to
create a reliable tool that solves a real operational need while
remaining easy to maintain.
