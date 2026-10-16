using System;
using System.Threading;
using System.Globalization;
using NAudio.Wave;
using NAudio.Dsp;
using NAudio.CoreAudioApi;
class HiveSpectrum {
 const int N=2048, Bands=24;
 static readonly object Gate=new object();
 static readonly float[] Ring=new float[N];
 static int position=0,rate=48000;static long lastSample;static volatile bool running=true,failed=false;
 static double[] Analyze(float[] samples,int sampleRate){
  Complex[] fft=new Complex[N];
  for(int i=0;i<N;i++)fft[i].X=(float)(samples[i]*(0.5-0.5*Math.Cos(2*Math.PI*i/(N-1))));
  FastFourierTransform.FFT(true,11,fft);double[] values=new double[Bands];
  double high=Math.Min(16000,sampleRate/2.0);
  for(int b=0;b<Bands;b++){
   double low=60*Math.Pow(high/60,b/(double)Bands),top=60*Math.Pow(high/60,(b+1)/(double)Bands),peak=0;
   int start=Math.Max(1,(int)Math.Floor(low*N/sampleRate)),end=Math.Min(N/2,Math.Max(start+1,(int)Math.Ceiling(top*N/sampleRate)));
   for(int k=start;k<end;k++)peak=Math.Max(peak,Math.Sqrt(fft[k].X*fft[k].X+fft[k].Y*fft[k].Y)*4);
   values[b]=Math.Max(0,Math.Min(1,(20*Math.Log10(Math.Max(peak,1e-9))+72)/72));
  }return values;
 }
 static void Main(string[] args){
  if(args.Length>0&&args[0]=="--test"){
   float[] tone=new float[N];for(int i=0;i<N;i++)tone[i]=(float)(.5*Math.Sin(2*Math.PI*1000*i/48000));
   double[] v=Analyze(tone,48000);int peak=0;for(int i=1;i<Bands;i++)if(v[i]>v[peak])peak=i;
   if(peak<10||peak>13)throw new Exception("FFT tone band mismatch");foreach(double x in Analyze(new float[N],48000))if(x!=0)throw new Exception("Silence is not zero");Console.WriteLine("PASS real FFT 1kHz peak and silent zero");return;
  }
  Thread input=new Thread(()=>{while(Console.ReadLine()!=null){}running=false;});input.IsBackground=true;input.Start();
  while(running){
   try{using(var devices=new MMDeviceEnumerator())using(var device=devices.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia))using(var capture=new WasapiLoopbackCapture(device)){
    string deviceId=device.ID;failed=false;rate=capture.WaveFormat.SampleRate;int channels=capture.WaveFormat.Channels,bits=capture.WaveFormat.BitsPerSample,block=capture.WaveFormat.BlockAlign;
    bool floating=capture.WaveFormat.Encoding==WaveFormatEncoding.IeeeFloat;
    var ext=capture.WaveFormat as WaveFormatExtensible;if(ext!=null)floating=ext.SubFormat==new Guid("00000003-0000-0010-8000-00aa00389b71");
    if(!((floating&&bits==32)||(!floating&&(bits==16||bits==24||bits==32))))throw new Exception("Unsupported mix format");
    lock(Gate){Array.Clear(Ring,0,N);position=0;lastSample=0;}
    capture.DataAvailable+=(s,e)=>{lock(Gate){for(int i=0;i+block<=e.BytesRecorded;i+=block){double value=0;
      for(int c=0;c<channels;c++){int o=i+c*(bits/8);double x=floating?BitConverter.ToSingle(e.Buffer,o):bits==16?BitConverter.ToInt16(e.Buffer,o)/32768.0:bits==32?BitConverter.ToInt32(e.Buffer,o)/2147483648.0:((e.Buffer[o]|e.Buffer[o+1]<<8|e.Buffer[o+2]<<16)<<8>>8)/8388608.0;
       value+=x;
      }Ring[position]=(float)(value/channels);position=(position+1)%N;}lastSample=DateTime.UtcNow.Ticks;}};
    capture.RecordingStopped+=(s,e)=>{failed=true;};capture.StartRecording();int ticks=0;
    while(running&&!failed){Thread.Sleep(40);float[] samples=new float[N];lock(Gate){if(DateTime.UtcNow.Ticks-lastSample<2500000)for(int i=0;i<N;i++)samples[i]=Ring[(position+i)%N];}
     double[] values=Analyze(samples,rate);string[] text=new string[Bands];for(int i=0;i<Bands;i++)text[i]=values[i].ToString("0.000",CultureInfo.InvariantCulture);Console.WriteLine("["+String.Join(",",text)+"]");
     if(++ticks%50==0){using(var current=devices.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia)){if(current.ID!=deviceId)break;}}
    }capture.StopRecording();
   }}catch(Exception){Console.WriteLine("{\"error\":\"audio-unavailable\"}");Thread.Sleep(1500);}
  }
 }
}
