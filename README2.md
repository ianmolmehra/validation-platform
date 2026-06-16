# Run on MacBook

## Prerequisites

```bash
brew install python@3.11
brew install mysql
brew services start mysql
```

## Database Setup

```bash
mysql -u root -p'root@123' -e "CREATE DATABASE IF NOT EXISTS validation_platform;"
mysql -u root -p'root@123' validation_platform < mysql/init.sql
```

## Backend

```bash
cd backend
/opt/homebrew/opt/python@3.11/bin/python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="mysql+pymysql://root:root%40123@localhost:3306/validation_platform"
uvicorn main:app --reload --port 8000
```

## Frontend (new terminal tab)

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

## Open

- http://localhost:3000
- http://localhost:8000/docs
