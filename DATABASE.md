# SiCuti --- Database Documentation

## 1. Overview

The SiCuti database is built on PostgreSQL through the Supabase
platform. The schema is intentionally compact and focuses on
representing the core entities required for school attendance
management.

The design prioritizes clarity. Each table represents a clear concept
within the system such as teachers, students, classes, or attendance
records.

Relationships between tables allow the application to generate reports
and maintain consistent records across the system.

## 2. Main Entities

The database contains several central tables that support the main
features of the application.

profiles\
Stores information about teachers and staff members.

classes\
Represents school classes organized by academic year.

students\
Contains the student roster and links each student to a class.

attendance_students\
Records daily attendance events for students.

attendance_guru\
Records attendance events for teachers.

leave_requests\
Stores leave applications submitted by teachers.

school_events\
Represents events and holidays displayed in the school calendar.

## 3. Profiles Table

The profiles table stores teacher and staff data.

Important fields include the user's full name, role, job title, and
contact information. Each profile also has a QR code used for attendance
scanning.

Teachers may also have a leave quota that determines how many leave days
they can request.

This table acts as the central reference for teacher related operations
throughout the system.

## 4. Students Table

The students table contains the core information for each student.

Each student is linked to a class using the class identifier. Additional
information such as guardian name, contact number, and date of birth is
also stored.

The QR code assigned to each student allows the attendance scanner to
quickly identify the correct student record.

## 5. Classes Table

Classes represent the academic grouping of students.

Each class has a name and is associated with a specific academic year.
The table also stores the identifier of the teacher assigned as the
homeroom teacher.

This structure allows the school to reuse the same class names in
different academic years while maintaining historical records.

## 6. Attendance Tables

Attendance information is stored in two tables.

The attendance_students table records student attendance. Each entry
captures the student identifier, attendance type, date, and status.

The attendance_guru table performs the same function for teachers. It
records check‑in and check‑out events for staff members.

Attendance status may include values such as present, late, sick,
permitted leave, or absent.

## 7. Leave Requests

The leave_requests table tracks leave applications submitted by
teachers.

Each record stores the requesting teacher, the date range of the leave,
and the reason for the request. Once an administrator reviews the
request, the system records whether it was approved or rejected along
with the reviewer information.

This allows the school to maintain a clear history of leave activity.

## 8. School Events

School events are stored in the school_events table. These events may
represent holidays or special school activities.

Some events are intended only for internal use, while others may be
displayed publicly to parents through the public calendar page.

Additional details such as event location or time can also be stored.

## 9. Security Model

Supabase Row Level Security is used to control access to sensitive data.

Teachers are generally limited to viewing their own leave requests and
personal information. Administrators have broader access that allows
them to manage users, classes, and attendance records.

Public data such as certain calendar events can be viewed without
authentication.

This security structure ensures that each user only interacts with the
data relevant to their role.

## 10. Future Improvements

The database design leaves room for additional features in the future.
Potential improvements include support for attendance corrections,
integration with messaging services for notifications, and expanded
reporting tables for analytics.

These additions can be implemented without restructuring the existing
core schema.
