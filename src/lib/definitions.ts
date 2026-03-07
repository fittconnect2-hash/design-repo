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
  name: string;
  version: string;
  description: string;
  figmaLink: string;
  prototypeUrl: string;
  imageUrl: string;
  tags: string[];
  createdAt?: any;
  updatedAt?: any;
};
