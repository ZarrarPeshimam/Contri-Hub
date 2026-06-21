import { useParams } from "react-router-dom";
import ProfilePageFeature from "../features/ProfilePage";

export default function ProfilePage() {
  const { username } = useParams();
  return <ProfilePageFeature username={username} />;
}
