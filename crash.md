Hypothesis:

1. The crash is due to a version mismatch between the Firebase SDK and the React Native Firebase SDK.

Test: disable firebase call on swipeL

export const createSwipe = async (
  videoId: string,
  direction: 'left' | 'right'
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be logged in to swipe');

  const swipe: Omit<Swipe, 'id'> = {
    videoId,
    userId: user.uid,
    direction,
    createdAt: Date.now(),
  };

  // Temporarily bypass the Firebase call to see if it prevents the crash.
  // Old v8-style call (Commented out):
  // await db.collection(Collections.SWIPES).add(swipe);

  // Uncomment one of the following test implementations:
  // Option 1: Use a dummy modular API call if available:
  await Promise.resolve();

  // Option 2: Log and return early:
  // console.log('Bypassing swipe firebase call for testing');
  // return;
};

Result:

STILL FUCKING CRASHES. EAT SHIT O3 DON'T YOU DARE PUSH THAT ON ME
AGAIN.




