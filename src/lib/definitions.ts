export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Staff Designer';
  createdAt?: any;
  updatedAt?: any;
};

export type Project = {
  userId: string;
  name: string;
  description: string;
  startDate?: any;
  endDate?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type Design = {
  userId: string;
  projectId: string;
  projectName?: string;
  name: string;
  version: string;
  description: string;
  figmaLink: string;
  prototypeUrl: string;
  imageUrl: string;
  tags: string[];
  isPublic?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type Invite = {
  id: string;
  email: string;
  role: 'Admin' | 'Staff Designer';
  createdAt?: any;
};

export type AuditLog = {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'INVITE' | 'REVOKE_INVITE' | 'SET_PUBLIC' | 'SET_PRIVATE' | 'UPDATE_ROLE';
  entityType: 'Project' | 'Design' | 'User' | 'Invite';
  entityId: string;
  entityName: string;
  details: string;
  timestamp: any;
};
