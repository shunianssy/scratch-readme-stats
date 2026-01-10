async function getUserInfo40c(id) {
  const url = `https://api.abc.520gxx.com/work/user?id=${encodeURIComponent(id)}&l=10000&token=`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let data = await response.json();
    data = data?.data || [];
    let likes = 0;
    let works = data.length;
    let looks = 0;
    if (works === 0) {
      return { works: 0, likes: 0, looks: 0 };
    }
    for (let i = 0; i < data.length; i++) {
      likes += data[i].like || 0;
      looks += (data[i].look || 0) + (data[i].oldlook || 0);
    }
    return { works, likes, looks };
  } catch (error) {
    console.error("40code 请求失败:", error);
    return { works: 0, likes: 0, looks: 0 };
  }
}

async function getUserInfoZc(id) {
  // 修复 URL 中的多余空格
  const url = `https://zerocat-api.houlangs.com/searchapi?search_userid=${encodeURIComponent(id)}&search_orderby=view_up&search_state=public&curr=1&limit=10000`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const projects = data?.projects || [];
    const works = projects.length;
    const likes = projects.reduce((acc, cur) => acc + (cur.star_count || 0), 0);
    return { works, likes, looks: 0 };
  } catch (error) {
    console.error("Zerocat 请求失败:", error);
    return { works: 0, likes: 0, looks: 0 };
  }
}

async function getUserInfoSBox(username) {
  const cleanName = encodeURIComponent(username.trim());
  const url = `https://sbox.yearnstudio.cn/api/user/ue?user=${cleanName}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data || typeof data.total_works !== 'number') {
      return { works: 0, likes: 0, looks: 0 };
    }

    // 合并 likes 和 stars 作为总点赞数
    const totalLikes = (data.likes || 0) + (data.stars || 0);
    return {
      works: data.total_works || 0,
      likes: totalLikes,
      looks: data.views || 0
    };
  } catch (error) {
    console.error("SBox 请求失败:", error);
    return { works: 0, likes: 0, looks: 0 };
  }
}

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const id40code = params.get('code');
    const zerocatid = params.get('zc');
    const sboxUser = params.get('sbox');
    const username = params.get('username') || 'Developer';
    let themeColor = params.get('color') || '#2f80ed';
    const theme = params.get('theme') || 'light';

    if (!themeColor.startsWith('#')) {
      themeColor = `#${themeColor}`;
    }

    if (!id40code && !zerocatid && !sboxUser) {
      return new Response("请提供有效的用户ID参数 (code、zc 或 sbox)", {
        status: 400,
        headers: { "content-type": "text/plain;charset=UTF-8" },
      });
    }

    let allWorks = 0;
    let allLikes = 0;
    let allLooks = 0;

    const promises = [];

    if (id40code) {
      promises.push(getUserInfo40c(id40code));
    } else {
      promises.push(Promise.resolve({ works: 0, likes: 0, looks: 0 }));
    }

    if (zerocatid) {
      promises.push(getUserInfoZc(zerocatid));
    } else {
      promises.push(Promise.resolve({ works: 0, likes: 0, looks: 0 }));
    }

    if (sboxUser) {
      promises.push(getUserInfoSBox(sboxUser));
    } else {
      promises.push(Promise.resolve({ works: 0, likes: 0, looks: 0 }));
    }

    const [info40c, infoZc, infoSBox] = await Promise.all(promises);

    allWorks = info40c.works + infoZc.works + infoSBox.works;
    allLikes = info40c.likes + infoZc.likes + infoSBox.likes;
    allLooks = info40c.looks + infoZc.looks + infoSBox.looks;

    // 计算 Rank
    let rankNum = allLikes * 1.2 + allWorks * 0.8 + allLooks * 0.01;
    console.log("RankNum:", rankNum);

    let rank = 'E';
    if (rankNum >= 10 && rankNum < 20) rank = 'D';
    else if (rankNum >= 20 && rankNum < 40) rank = 'C';
    else if (rankNum >= 40 && rankNum < 70) rank = 'B';
    else if (rankNum >= 70 && rankNum < 100) rank = 'BPLUS';
    else if (rankNum >= 100 && rankNum < 150) rank = 'A';
    else if (rankNum >= 150 && rankNum < 250) rank = 'APLUS';
    else if (rankNum >= 250 && rankNum < 300) rank = 'APLUSPLUS';
    else if (rankNum >= 300 && rankNum < 400) rank = 'S';
    else if (rankNum >= 400) rank = 'SPLUS';

    // 进度条逻辑
    const totalDash = 251.2;
    const rankProgress = {
      'SPLUS': 1.0,
      'S': 0.9,
      'APLUSPLUS': 0.85,
      'APLUS': 0.8,
      'A': 0.7,
      'BPLUS': 0.6,
      'B': 0.5,
      'C': 0.3,
      'D': 0.1,
      'E': 0
    };
    const progressPercent = rankProgress[rank] || 0;
    const targetOffset = totalDash * (1 - progressPercent);
    const rankResult = rank.replaceAll("PLUS", "+");

    // SVG 模板
    let svg;
    if (theme === 'dark') {
      svg = `<svg width="400" height="150" viewBox="0 0 400 150" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${themeColor}; animation: fadeIn 0.8s ease-in-out forwards; }
    .stat { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #c9d1d9; opacity: 0; animation: slideIn 0.5s ease-in-out forwards; }
    .label { font-weight: 600; }
    .rank-text { 
      font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${themeColor}; 
      opacity: 0; transform-box: fill-box; transform-origin: center;
      animation: zoomIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 1.2s; 
    }
    .progress-bar { 
      stroke-dasharray: ${totalDash}; 
      stroke-dashoffset: ${totalDash}; 
      animation: progress 1.2s ease-in-out forwards 0.4s; 
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-15px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes progress { to { stroke-dashoffset: ${targetOffset}; } }
    @keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
    .delay-1 { animation-delay: 0.2s; }
    .delay-2 { animation-delay: 0.4s; }
  </style>
  <rect x="0.5" y="0.5" rx="10" width="399" height="149" fill="#0d1117" stroke="#30363d"/>
  <text x="25" y="35" class="header">${username}'s Stats</text>
  <g transform="translate(25, 70)">
    <g class="stat delay-1">
      <text x="0" y="0" class="label">点赞/Star:</text>
      <text x="110" y="0">${allLikes}</text>
    </g>
    <g class="stat delay-2">
      <text x="0" y="30" class="label">作品数:</text>
      <text x="110" y="30">${allWorks}</text>
    </g>
    <g class="stat delay-2">
      <text x="0" y="60" class="label">查看数:</text>
      <text x="110" y="60">${allLooks}</text>
    </g>
  </g>
  <g transform="translate(310, 80)">
    <circle r="40" cx="0" cy="0" stroke="#30363d" stroke-width="8" fill="none" />
    <circle r="40" cx="0" cy="0" stroke="${themeColor}" stroke-width="8" fill="none" 
            stroke-linecap="round" class="progress-bar" transform="rotate(-90)" />
    <text x="0" y="8" text-anchor="middle" class="rank-text">${rankResult}</text>
  </g>
</svg>`;
    } else {
      svg = `<svg width="400" height="150" viewBox="0 0 400 150" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${themeColor}; animation: fadeIn 0.8s ease-in-out forwards; }
    .stat { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #434d58; opacity: 0; animation: slideIn 0.5s ease-in-out forwards; }
    .label { font-weight: 600; }
    .rank-text { 
      font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${themeColor}; 
      opacity: 0; transform-box: fill-box; transform-origin: center;
      animation: zoomIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 1.2s; 
    }
    .progress-bar { 
      stroke-dasharray: ${totalDash}; 
      stroke-dashoffset: ${totalDash}; 
      animation: progress 1.2s ease-in-out forwards 0.4s; 
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-15px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes progress { to { stroke-dashoffset: ${targetOffset}; } }
    @keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
    .delay-1 { animation-delay: 0.2s; }
    .delay-2 { animation-delay: 0.4s; }
  </style>
  <rect x="0.5" y="0.5" rx="10" width="399" height="149" fill="#fffefe" stroke="#e4e2e2"/>
  <text x="25" y="35" class="header">${username}'s Stats</text>
  <g transform="translate(25, 70)">
    <g class="stat delay-1">
      <text x="0" y="0" class="label">点赞/Star:</text>
      <text x="110" y="0">${allLikes}</text>
    </g>
    <g class="stat delay-2">
      <text x="0" y="30" class="label">作品数:</text>
      <text x="110" y="30">${allWorks}</text>
    </g>
    <g class="stat delay-2">
      <text x="0" y="60" class="label">查看数:</text>
      <text x="110" y="60">${allLooks}</text>
    </g>
  </g>
  <g transform="translate(310, 80)">
    <circle r="40" cx="0" cy="0" stroke="#eee" stroke-width="8" fill="none" />
    <circle r="40" cx="0" cy="0" stroke="${themeColor}" stroke-width="8" fill="none" 
            stroke-linecap="round" class="progress-bar" transform="rotate(-90)" />
    <text x="0" y="8" text-anchor="middle" class="rank-text">${rankResult}</text>
  </g>
</svg>`;
    }

    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml;charset=UTF-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("handleRequest 错误:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain;charset=UTF-8" },
    });
  }
}
