import { useUser, UserProfile } from "@clerk/react-router";

function ProfilePage() {
  const { isSignedIn, user, isLoaded } = useUser();

  // Handle loading state
  if (!isLoaded) return <div>Loading...</div>;

  // Protect the page from unauthenticated users
  if (!isSignedIn) return <div>Sign in to view this page</div>;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <UserProfile />
    </div>
  );
}

export default ProfilePage;
