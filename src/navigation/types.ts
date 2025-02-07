export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  VideoDetail: { videoId: string };
  Settings: undefined;
};

export type TabParamList = {
  Feed: undefined;
  Discover: undefined;
  Create: undefined;
  Notifications: undefined;
  Profile: undefined;
}; 