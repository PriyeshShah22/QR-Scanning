# QR Code Data Management System

A web-based QR Code Data Management System built using **Flask**, **Python**, and **SQL Server**. The application allows users to scan QR codes using the device camera, add additional details, upload images, and securely store and manage records through a centralized interface.

## Features

- User Login & Registration
- QR Code Scanning using Camera
- Add and Validate QR Data
- Upload Images
- View, Edit & Delete Records
- SQL Server Database Integration
- Secure Session Management
- Responsive Web Interface

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Flask, Python
- **Database:** Microsoft SQL Server, pyodbc

## Project Structure

```text
Project/
├── app.py
├── database.py
├── database_schema.sql
├── requirements.txt
├── uploads/
├── templates/
└── static/
```

## Setup

1. Install Python 3.10+, SQL Server, and ODBC Driver 18.
2. Run `database_schema.sql` in SQL Server.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the application:

```bash
python app.py
```

5. Open:

```
http://127.0.0.1:5000
```

## Future Enhancements

- Android Application
- Cloud Storage Integration
- QR Code Generation
- Export to PDF/Excel
- Advanced Search & Filtering
