import { Typography, Card, Space, Avatar } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const About = () => {
  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Typography>
        <Title>关于我们</Title>
        <Paragraph>
          这是一个演示项目，展示了如何使用现代前端技术栈构建React应用。
        </Paragraph>
      </Typography>
      <Card>
        <Space>
          <Avatar size={64} icon={<GithubOutlined />} />
          <div>
            <Title level={4}>技术栈</Title>
            <ul>
              <li>React 19</li>
              <li>TypeScript</li>
              <li>Vite</li>
              <li>Ant Design</li>
              <li>React Router</li>
            </ul>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default About;