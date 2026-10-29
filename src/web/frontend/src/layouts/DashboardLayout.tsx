import Base from "./Base";

export default function DashboardLayout(props) {
  return <Base {...props} maxWidth="max-w-[1440px]" hideNavbar={true} hideFooter={true} />;
}
