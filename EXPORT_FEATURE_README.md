# Excel Export Feature for HR Reports

## Overview
Excel export functionality has been added to all HR reports in the system. Users can now export filtered report data to CSV format (compatible with Excel).

## Features Added

### Backend (PHP/Laravel)
- **Location**: `app/Http/Controllers/HrReportController.php`
- **New Methods**: 9 export methods added
  - exportAbsenceReport()
  - exportLatenessReport()
  - exportLeaveReport()
  - exportMedicalExcuseReport()
  - exportWarningReport()
  - exportExpiredContractsReport()
  - exportTrainingReport()
  - exportResignationReport()
  - exportTurnoverReport()

### Routes Added
- **Location**: `routes/web.php`
- **New Routes**: 9 export endpoints
  - GET /hr/reports/absences/export
  - GET /hr/reports/lateness/export
  - GET /hr/reports/leaves/export
  - GET /hr/reports/medical-excuses/export
  - GET /hr/reports/warnings/export
  - GET /hr/reports/expired-contracts/export
  - GET /hr/reports/training/export
  - GET /hr/reports/resignations/export
  - GET /hr/reports/turnover/export

### Frontend (React/TypeScript)
- **New Component**: `resources/js/pages/hr/reports/components/export-button.tsx`
- **Updated Files**: All 9 report pages now include the ExportButton component

## Usage

1. Navigate to any HR report page
2. Apply desired filters (branch, department, employee, dates, etc.)
3. Click the "Export to Excel" button
4. A CSV file will be downloaded with the filtered data

## Export Format

All exports are in CSV format which includes:
- Column headers
- Filtered data based on current search and filter criteria
- Formatted dates and status values
- All relevant employee and organizational information

## Permissions

Export functionality respects the same permissions as viewing reports:
- view-attendance-records (for Absence & Lateness reports)
- view-leave-applications (for Leave & Medical Excuse reports)
- view-warnings (for Warning reports)
- view-employee-contracts (for Expired Contracts report)
- view-employee-trainings (for Training report)
- view-resignations (for Resignation report)
- view-turnover-report (for Turnover report)

## Technical Details

- Export uses CSV streaming for efficient memory usage
- No external package dependencies required
- Filters are preserved in export
- UTF-8 encoding for international characters
- Date formats: YYYY-MM-DD
- Time formats: HH:MM:SS
