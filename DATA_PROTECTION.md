# Data protection, backup and recovery policy

## Current deployment boundary

BSC-MASTER currently stores its primary database in browser localStorage. Data is local to the browser profile and origin. It does not automatically synchronize between browsers, devices, or users. Clearing browser storage, losing the device, or losing access to the browser profile can still destroy the primary copy.

## Local recovery behavior

- Each successful database save attempts to preserve the immediately previous primary snapshot in a separate local storage key.
- The primary save is committed before refreshing the recovery snapshot. If the browser quota prevents the recovery copy from being updated, the successful primary save remains successful and a warning is logged.
- The Backup & Restore screen offers explicit restoration of the previous local snapshot.
- A JSON export is the portable backup. Export it to storage outside the browser/device and verify it can be imported periodically.
- JSON imports are validated before replacing the current database. Invalid files must not overwrite the current primary database.
- The previous local snapshot is a convenience recovery mechanism, not a disaster-recovery backup. It shares the same browser/device failure domain.

## Recommended operational schedule

1. Export a JSON backup before bulk imports, major restructuring, or deleting large groups of records.
2. Export at the end of each reporting cycle and retain copies in an approved organization-controlled location.
3. Periodically test restoration into a separate browser profile or test environment.
4. Limit access to backup files because they may contain sensitive strategic, financial, risk, and performance data.

## Server synchronization is not implemented

A future multi-user/server deployment must define authentication, organization-level authorization, server-side validation, conflict handling, audit logging, encryption in transit and at rest, backup retention, restore testing, and recovery-point/recovery-time objectives before synchronization is enabled. Browser local storage must not be treated as an authorization boundary.
