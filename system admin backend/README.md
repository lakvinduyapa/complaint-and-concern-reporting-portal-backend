# System Administration Backend

Backend API for the System Administration Dashboard.

## Completed modules

- Health check
- User Management
- Role Management
- Privilege Management
- Email Template Management
- QR Code Management
- Backup & Recovery record management

## Important behavior

`DELETE /api/users/:id` does not permanently delete a user. It marks the user status as `Inactive` so the record can be counted and reviewed later.

## Base URL

```txt
http://localhost:5051/api
```


User status rule: Active and Inactive are used for temporary access control. Delete permanently removes the user record from the users table.
