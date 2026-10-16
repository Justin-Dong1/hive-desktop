using System;
using Windows.Storage.Streams;
using Windows.Foundation;
public static class HiveMediaCover {
 static T Wait<T>(IAsyncOperation<T> operation) {
  var deadline=DateTime.UtcNow.AddMilliseconds(3500);
  while(operation.Status==AsyncStatus.Started){if(DateTime.UtcNow>deadline){operation.Cancel();throw new TimeoutException("Thumbnail request timed out");}System.Threading.Thread.Sleep(20);}
  return operation.GetResults();
 }
 public static string Read(RandomAccessStreamReference thumbnail) {
  using(var stream=Wait(thumbnail.OpenReadAsync())) {
   if(stream.Size==0) return "";
   if(stream.Size>4*1024*1024) throw new InvalidOperationException("Thumbnail exceeds 4 MB");
   using(var input=stream.GetInputStreamAt(0))
   using(var reader=new DataReader(input)) {
    var loaded=Wait<uint>(reader.LoadAsync((uint)stream.Size));
    if(loaded!=stream.Size) throw new InvalidOperationException("Incomplete thumbnail stream");
    var bytes=new byte[loaded];reader.ReadBytes(bytes);
    // Some players report a comma-separated MIME list, invalid in a data URL.
    string mime;
    if(bytes.Length>=3&&bytes[0]==255&&bytes[1]==216&&bytes[2]==255)mime="image/jpeg";
    else if(bytes.Length>=8&&bytes[0]==137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71)mime="image/png";
    else if(bytes.Length>=6&&bytes[0]==71&&bytes[1]==73&&bytes[2]==70)mime="image/gif";
    else if(bytes.Length>=2&&bytes[0]==66&&bytes[1]==77)mime="image/bmp";
    else if(bytes.Length>=12&&bytes[0]==82&&bytes[1]==73&&bytes[2]==70&&bytes[8]==87&&bytes[9]==69&&bytes[10]==66&&bytes[11]==80)mime="image/webp";
    else throw new InvalidOperationException("Unrecognized thumbnail image format");
    return "data:"+mime+";base64,"+Convert.ToBase64String(bytes);
   }
  }
 }
}
