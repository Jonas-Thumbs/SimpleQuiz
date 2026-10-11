import { SignUp } from "@clerk/react-router";

function SignUpPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SignUp />
    </div>
  );
}

export default SignUpPage;
