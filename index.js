var chunkSize = 1024*1024; // bytes
var timeout = 10; // millisec
var collectAddress = "1L7opWPQsWxhY7FvLUzjLdeWmcybwuarPZ"
var collectPaypail = "25614@moneybutton.com"

var inputElement = document.getElementById("document");
inputElement.addEventListener("change", handleFiles, false);
inputElement.onclick = function(event){
    clear();
}

function handleFiles() {
    var file = this.files[0];
    if(file===undefined){
        return;
    }
    var SHA256 = CryptoJS.algo.SHA256.create();
    var counter = 0;
    var self = this;

    var timeStart = new Date().getTime();
    var timeEnd = 0;
    document.getElementById("fileSize").value = humanFileSize(file.size,true);

    loading(file,
        function (data) {
            var wordBuffer = CryptoJS.lib.WordArray.create(data);
            SHA256.update(wordBuffer);
            counter += data.byteLength;
            //console.log((( counter / file.size)*100).toFixed(0) + '%');
        }, function (data) {
            //console.log('100%');
            var encrypted = SHA256.finalize().toString();
            document.getElementById("hash").value = encrypted;
            timeEnd = new Date().getTime();
            showMB()
        });

};

function clear(){
    document.getElementById("hash").value = '';
    document.getElementById("fileSize").value = '';

    lastOffset = 0;
    chunkReorder = 0;
    chunkTotal = 0;
}


function loading(file, callbackProgress, callbackFinal) {
    //var chunkSize  = 1024*1024; // bytes
    var offset     = 0;
    var size=chunkSize;
    var partial;
    var index = 0;

    if(file.size===0){
        callbackFinal();
    }
    while (offset < file.size) {
        partial = file.slice(offset, offset+size);
        var reader = new FileReader;
        reader.size = chunkSize;
        reader.offset = offset;
        reader.index = index;
        reader.onload = function(evt) {
            callbackRead(this, file, evt, callbackProgress, callbackFinal);
        };
        reader.readAsArrayBuffer(partial);
        offset += chunkSize;
        index += 1;
    }
}

function callbackRead(obj, file, evt, callbackProgress, callbackFinal){
    callbackRead_buffered(obj, file, evt, callbackProgress, callbackFinal);
}

var lastOffset = 0;
var chunkReorder = 0;
var chunkTotal = 0;
// time reordering
function callbackRead_waiting(reader, file, evt, callbackProgress, callbackFinal){
    if(lastOffset === reader.offset) {
        console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"");
        lastOffset = reader.offset+reader.size;
        callbackProgress(evt.target.result);
        if ( reader.offset + reader.size >= file.size ){
            lastOffset = 0;
            callbackFinal();
        }
        chunkTotal++;
    } else {
        console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"wait");
        setTimeout(function () {
            callbackRead_waiting(reader,file,evt, callbackProgress, callbackFinal);
        }, timeout);
        chunkReorder++;
    }
}
// memory reordering
var previous = [];
function callbackRead_buffered(reader, file, evt, callbackProgress, callbackFinal){
    chunkTotal++;

    if(lastOffset !== reader.offset){
        // out of order
        console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,">>buffer");
        previous.push({ offset: reader.offset, size: reader.size, result: reader.result});
        chunkReorder++;
        return;
    }

    function parseResult(offset, size, result) {
        lastOffset = offset + size;
        callbackProgress(result);
        if (offset + size >= file.size) {
            lastOffset = 0;
            callbackFinal();
        }
    }

    // in order
    console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"");
    parseResult(reader.offset, reader.size, reader.result);

    // resolve previous buffered
    var buffered = [{}]
    while (buffered.length > 0) {
        buffered = previous.filter(function (item) {
            return item.offset === lastOffset;
        });
        buffered.forEach(function (item) {
            console.log("[", item.size, "]", item.offset, '->', item.offset + item.size, "<<buffer");
            parseResult(item.offset, item.size, item.result);
            previous.remove(item);
        })
    }

}

Array.prototype.remove = Array.prototype.remove || function(val){
    var i = this.length;
    while(i--){
        if (this[i] === val){
            this.splice(i,1);
        }
    }
};

// Human file size
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

// RelayX buy widget
function relayxBuyPopup() {
    // include referrer to get 30% rev share, it must be paymail
    relayotc.buy('relayx-buy-container', {referrer: collectPaypail});
  }

// show MB button
function showMB() {
  var name = document.getElementById('document').files.item(0).name
  var hash = document.getElementById("hash").value
  var opReturn = bsv.Script.buildSafeDataOut(['1MSeMPLoDvgQr2ZKgXEM3GDU7hxUnsRyRw', name, hash]).toASM()
  console.log(opReturn)

  const mbDiv = document.getElementById('my-money-button')
  moneyButton.render(mbDiv, {
    outputs: [{
      address: collectAddress,
      amount: "0.008",
      currency: "USD"
    },
    {
      script: opReturn,
      amount: '0',
      currency: 'BSV'
    }],
    onPayment: function (arg) { onMbPayment(arg) }
  }
)
}

function onMbPayment(arg) {
  document.getElementById("payment-message").innerHTML = "Transaction id of the proof: " + arg.txid;
  clear()
}
