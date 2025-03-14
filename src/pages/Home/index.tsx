/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLayoutEffect, useRef } from "react";
import { Card, Space, Image, Table, Tag, Button, message } from "antd";
import type { TableProps } from "antd";
import { snapshot, rebuild } from "rrweb-snapshot";
import echarts from "@/utils/echarts";
import { sleep } from "@/utils/index";
import { uploadToOSS, downloadImage } from "@/utils/image";
import demoImg from "@/assets/demo.png";
import { tableData, echartsOption } from "./constants";
import type { DataType } from "./types";
import s from "./index.module.scss";

const columns: TableProps<DataType>["columns"] = [
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    render: (text) => <a>{text}</a>,
  },
  {
    title: "Age",
    dataIndex: "age",
    key: "age",
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "Tags",
    key: "tags",
    dataIndex: "tags",
    render: (_, { tags }) => (
      <>
        {tags.map((tag) => {
          let color = tag.length > 5 ? "geekblue" : "green";
          if (tag === "loser") {
            color = "volcano";
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          );
        })}
      </>
    ),
  },
  {
    title: "Action",
    key: "action",
    render: (_, record) => (
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
];

const Home: React.FC = () => {
  const $div = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chartRef = useRef<echarts.ECharts>(null);
  const resizeObserver = useRef<ResizeObserver>(null);

  useLayoutEffect(() => {
    if ($div.current) {
      initEcharts();
    }
  }, []);

  const initEcharts = (): void => {
    const myChart = echarts.init($div.current);
    myChart.setOption(echartsOption);
    chartRef.current = myChart;

    // 监听echarts容器的size变化，当echarts图形尺寸与容器尺寸不匹配时，执行resize
    resizeObserver.current = new ResizeObserver(resizeCallback);
    if ($div.current) {
      resizeObserver.current.observe($div.current);
    }
  };

  const resizeCallback = () => {
    if (!chartRef.current) return;
    const $dom = chartRef.current.getDom();
    const { clientHeight, clientWidth } = $dom;
    const width = chartRef.current.getWidth();
    const height = chartRef.current.getHeight();
    if (!clientHeight || !clientWidth) return;
    if (width !== clientWidth || height !== clientHeight) {
      chartRef.current.resize();
    }
  };

  /**
   * 图片的第一种处理方式，将上传到图床，更换导出后的src，使其可以正常访问
   * 优点：处理方便，导出的html文件体积较小
   * 缺点：下载的html需要联网才能正常访问图片
   * @param doc
   */
  const processImages = async (doc: Document): Promise<void> => {
    const images = doc.getElementsByTagName("img");

    for (const img of Array.from(images)) {
      try {
        const originalSrc = img.src;
        if (originalSrc.startsWith("http")) {
          //
          const blob = await downloadImage(originalSrc);
          const newUrl = await uploadToOSS(blob);
          img.src = newUrl;
        }
      } catch (error) {
        console.error("处理图片失败:", error);
      }
    }
  };

  /**
   * 图片的第二种处理方式，将其转为 base64, 注入到html中
   * 优点：离线也能访问
   * 缺点：会造成导出的html文件体积很大
   * @param doc
   */
  const processImages2Base64 = async (doc: Document): Promise<void> => {
    const images = doc.getElementsByTagName("img");

    for (const img of Array.from(images)) {
      try {
        const originalSrc = img.src;
        if (originalSrc.startsWith("http") || originalSrc.startsWith("https")) {
          const blob = await downloadImage(originalSrc);
          const reader = new FileReader();
          const base64Url = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = base64Url;
        }
      } catch (error) {
        console.error("处理图片失败:", error);
      }
    }
  };

  const processCanvas = async (doc: Document): Promise<void> => {
    const canvases = doc.getElementsByTagName("canvas");

    for (const canvas of Array.from(canvases)) {
      try {
        // 创建新的图片元素
        const img = doc.createElement("img");
        // 将 canvas 转换为 base64 图片
        const dataUrl = canvas.toDataURL("image/png");
        img.src = dataUrl;

        // 复制 canvas 的样式和属性
        const width = chartRef.current?.getWidth();
        const height = chartRef.current?.getHeight();
        img.width = width ?? canvas.width;
        img.height = height ?? canvas.height;

        img.style.cssText = canvas.style.cssText;
        if (canvas.id) img.id = canvas.id;
        if (canvas.className) img.className = canvas.className;

        // 替换 canvas
        canvas.parentNode?.replaceChild(img, canvas);
      } catch (error) {
        console.error("处理 canvas 失败:", error);
      }
    }
  };

  const onLoadPromise = (iframe: HTMLIFrameElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      iframe.onload = async () => {
        const $doc = iframe.contentWindow?.document;
        if (!$doc) {
          return reject("$doc为空");
        }

        // 制造延迟，等待1s
        await sleep(1000);

        // 处理img
        // processImages($doc);
        await processImages2Base64($doc);

        // 处理canvas
        await processCanvas($doc);

        const serializedNodeId = snapshot($doc, {
          inlineStylesheet: true,
          inlineImages: true,
          recordCanvas: true,
          preserveWhiteSpace: true,
        });
        if (!serializedNodeId) {
          return reject("serializedNodeId为空");
        }

        rebuild(serializedNodeId, {
          doc: $doc,
          cache: undefined as any,
          mirror: undefined as any,
        });
        return resolve(
          iframe.contentWindow?.document.documentElement.outerHTML
        );
      };
    });
  };

  const getHtml = async (): Promise<string> => {
    const iframe = createIframe();
    await onLoadPromise(iframe);
    return iframe.contentWindow?.document.documentElement.outerHTML ?? "";
  };

  const createIframe = () => {
    // 创建并设置 iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.zIndex = "-1";
    iframe.width = `${document.body.clientWidth}px`;
    iframe.height = `${document.body.clientHeight}px`;
    iframe.src = location.href;
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    return iframe;
  };

  const removeIframe = () => {
    if (iframeRef.current) {
      // 清理 iframe 的内容
      const iframeDoc = iframeRef.current.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.close();
      }

      // 移除 iframe 元素
      iframeRef.current.remove();
      iframeRef.current = null;
    }
  };

  const downloadHtml = (html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "home.html";
    a.click();
    message.success("导出成功！");
  };

  const exportHtml = async () => {
    try {
      const html = await getHtml();
      downloadHtml(html);
      removeIframe();
    } catch (e: any) {
      message.error(`导出失败，${e?.message}`);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      <Card>
        <h2>欢迎来到首页</h2>
        <div className={s["export-div"]}>
          <div>
            这是一个使用 React + Vite + TypeScript 构建的示例项目，集成了 Ant
            Design 组件库和 React Router 路由系统。
          </div>
          <Button type="primary" onClick={exportHtml}>
            导出HTML
          </Button>
        </div>
      </Card>

      <Card title="功能特点">
        <ul>
          <li>基于 Vite 的快速开发体验</li>
          <li>TypeScript 的类型安全</li>
          <li>Ant Design 的精美组件</li>
          <li>React Router 的路由管理</li>
        </ul>
      </Card>
      {/* <Image
        width={200}
        src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
      /> */}
      <img src={demoImg} alt="demo" width={200} />
      <div ref={$div} className={s["echart-div"]}></div>
      <Table<DataType> columns={columns} dataSource={tableData} />
    </Space>
  );
};

export default Home;
