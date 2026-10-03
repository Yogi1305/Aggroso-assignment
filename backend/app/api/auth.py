from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.database import get_db
from app.models.models import User, RoleEnum, RoleRequest, RoleRequestStatus
from app.schemas.schemas import UserCreate, UserResponse, UserLogin, TokenResponse, RoleUpgradeCreate, RoleUpgradeResponse, RoleUpgradeAction
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

import bcrypt

SECRET_KEY = getattr(settings, "SECRET_KEY", "your-super-secret-key-for-jwt-signing")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user_data.password)
    # Always register every user as 'user' (Employee). Elevated roles require Admin approval.
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        contact=user_data.contact,
        role=RoleEnum.USER.value,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If user requested elevated role upon registration, create a pending RoleRequest automatically
    if user_data.role in [RoleEnum.REVIEWER.value, RoleEnum.ADMIN.value]:
        req = RoleRequest(
            user_id=new_user.id,
            user_email=new_user.email,
            requested_role=user_data.role,
            reason="Requested during initial account setup",
            status=RoleRequestStatus.PENDING.value
        )
        db.add(req)
        db.commit()

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if not db_user or not verify_password(user_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "role": db_user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": db_user.role}

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out. Please remove the token from your client."}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/role-request", response_model=RoleUpgradeResponse)
def create_role_request(
    req_in: RoleUpgradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req_in.requested_role not in [RoleEnum.REVIEWER.value, RoleEnum.ADMIN.value]:
        raise HTTPException(status_code=400, detail="Requested role must be 'reviewer' or 'admin'")
    
    # Check if there is already a pending request
    existing = db.query(RoleRequest).filter(
        RoleRequest.user_id == current_user.id,
        RoleRequest.status == RoleRequestStatus.PENDING.value
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending role upgrade request")

    role_req = RoleRequest(
        user_id=current_user.id,
        user_email=current_user.email,
        requested_role=req_in.requested_role,
        reason=req_in.reason,
        status=RoleRequestStatus.PENDING.value
    )
    db.add(role_req)
    db.commit()
    db.refresh(role_req)
    return role_req

@router.get("/role-requests", response_model=list[RoleUpgradeResponse])
def get_role_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Admins can view role requests")
    return db.query(RoleRequest).order_by(RoleRequest.id.desc()).all()

@router.post("/role-requests/{request_id}/decision", response_model=RoleUpgradeResponse)
def decision_role_request(
    request_id: int,
    action_in: RoleUpgradeAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Admins can approve or reject role requests")
    
    req = db.query(RoleRequest).filter(RoleRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Role request not found")

    action = action_in.action.upper()
    if action == "APPROVE":
        req.status = RoleRequestStatus.APPROVED.value
        # Update actual user role to requested role
        target_user = db.query(User).filter(User.id == req.user_id).first()
        if target_user:
            target_user.role = req.requested_role
    elif action == "REJECT":
        req.status = RoleRequestStatus.REJECTED.value
    else:
        raise HTTPException(status_code=400, detail="Action must be APPROVE or REJECT")

    db.commit()
    db.refresh(req)
    return req


