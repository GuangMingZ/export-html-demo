import { Outlet, Link } from "react-router-dom";
import { Layout as AntLayout, Menu } from "antd";
import { HomeOutlined, InfoCircleOutlined } from "@ant-design/icons";
import s from "./index.module.scss";

const { Header, Content } = AntLayout;

const Layout = () => {
  const menuItems = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: "about",
      icon: <InfoCircleOutlined />,
      label: <Link to="/about">关于</Link>,
    },
  ];

  return (
    <AntLayout className={s["my-layout"]}>
      <Header>
        <Menu mode="horizontal" items={menuItems} />
      </Header>
      <Content>
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
