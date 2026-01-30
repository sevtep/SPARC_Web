#!/usr/bin/env python3
"""
FastAPI 应用启动入口
用于在生产环境中启动应用
"""
import uvicorn
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

if __name__ == "__main__":
    # 配置参数
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "12345"))
    RELOAD = os.getenv("RELOAD", "False").lower() == "true"
    WORKERS = int(os.getenv("WORKERS", "1"))
    
    print(f"""
╔════════════════════════════════════════╗
║     PING 教育平台 - 后端服务启动      ║
╚════════════════════════════════════════╝
    
🚀 服务器地址: http://{HOST}:{PORT}
📚 API 文档: http://{HOST}:{PORT}/docs
🔧 工作进程: {WORKERS}
🔄 自动重载: {RELOAD}
    """)
    
    # 启动 uvicorn 服务器
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
        workers=WORKERS if not RELOAD else 1,  # reload 模式只能单进程
        log_level="info",
        access_log=True,
    )
