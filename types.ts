export interface Channel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  url: string;
}

export interface Category {
  name: string;
  count: number;
}
