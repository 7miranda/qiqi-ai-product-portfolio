/* Metres, seconds and tangent headings. Shared by rendering and route checks. */
const LogisticsMotion = (() => {
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x=clamp(x); return x*x*(3-2*x); };
  const truckLength=10+Math.PI*3+35;
  function truck(d){
    d=Math.max(0,Math.min(truckLength,d));
    if(d<=10)return {x:-1.8,z:23+d,yaw:0,steer:0};
    if(d<10+Math.PI*3){const a=(d-10)/6;return {x:4.2-6*Math.cos(a),z:33+6*Math.sin(a),yaw:a,steer:Math.atan(4.52/6)};}
    return {x:4.2+d-10-Math.PI*3,z:39,yaw:Math.PI/2,steer:0};
  }
  const duration=[3.8,5.4,3.8];
  function departure(route,seconds){
    const elapsed=Math.max(0,Math.min(duration[route],seconds));
    const t=elapsed*[9/3.8,13/5.4,9/3.8][route];
    const shipTime=route===0?Math.max(0,t-1.2):0;
    const planeTime=route===2?Math.max(0,t-1):route===1?Math.max(0,t-5):0;
    const truckDistance=route===1?Math.min(truckLength,.78*t*t):0;
    const planeDistance=.72*planeTime*planeTime;
    const climb=Math.max(0,planeTime-4);
    const stages=route===0?['解缆离泊','驶离泊位','进入远洋航线']:route===1?['海运货物转关','接驳车前往空港','接续航班起飞']:['撤离地面保障','沿跑道加速','离地爬升'];
    const index=route===1?(t<3?0:t<6?1:2):(t<1.3?0:t<5?1:2);
    return {progress:elapsed/duration[route],stage:stages[index],truckDistance,
      ship:{x:-18-.24*shipTime*shipTime,z:14,yaw:Math.PI},
      plane:{x:23,z:21-planeDistance,y:1.91+climb*climb*.48,pitch:-.12*ease(climb/2)},
      gear:1-ease((climb-1)/2),loaderRetreat:route===0?0:ease((t-(route===1?4:0))/1.1),done:elapsed>=duration[route]};
  }
  function forklift(seconds,phase=0){
    const t=((seconds+phase)%26+26)%26;
    let z=-3.8,mast=0,loaded=false;
    if(t<2)z=-3.8-1.7*ease(t/2);
    else if(t<4){z=-5.5;mast=.28*ease((t-2)/2);loaded=true;}
    else if(t<12){z=-5.5-8.5*ease((t-4)/8);mast=.28;loaded=true;}
    else if(t<14){z=-14;mast=.28*(1-ease((t-12)/2));loaded=true;}
    else if(t<24)z=-14+10.2*ease((t-14)/10);
    return {t,z,yaw:Math.PI,mast,loaded,source:t<2||t>=24,destination:t>=14&&t<20,sourceSlide:t>=24?1-ease((t-24)/2):0,destinationSlide:ease((t-17)/3),stage:t<2?'取货对位':t<4?'抬叉取货':t<12?'载货行驶':t<14?'落叉卸货':'空载倒车'};
  }
  return {ease,truck,truckLength,duration,departure,forklift};
})();
