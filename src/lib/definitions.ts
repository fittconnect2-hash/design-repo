export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Member';
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
