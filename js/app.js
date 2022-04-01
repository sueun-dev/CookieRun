function scheduler(action, ms = 1000, runRightNow = true) {
  if (runRightNow) action();
  setInterval(action, ms);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const config = {
  contracts: {
    ERC721: {
      abi: abi.ERC721,
      //ns
      address: '0xe4c363620868cCE1c9A0100C4023dE0040563738',
    },
    buyERC721: {
      abi: abi.buyERC721,
      //s
      address: '0x02eD03Bb13Ea34B3A4354e9805D4cf39dc692CDF',
    },
  },
};

const App = {
  provider: null,
  currentAccount: null,
  connected: false,

  init: async function () {
    await App.initCaver();
    await ERC721.init();
    await buyERC721.init();
    
    if (pageName === 'NFT') {
      await ERC721.pageInit();
    }
  },
  initCaver: async function () {
    if (typeof window.klaytn !== 'undefined' && klaytn.isKaikas) {
      // Kaikas user detected. You can now use the provider.
      provider = window['klaytn'];
    }else{
      alert('There is no Kaikas. Please install Kaikas.').close(5000);
    }

    try {
      await App.connect();
      await App.chnaged();
    } catch (error) {
      if (error.code === 4001) {
        // User rejected request
        alert('Please reflesh this page (F5)').close(3000);
      }
      console.log(error);
    }
  },
  connect: async function () {
    //Kakias가 enable상태가 아니라면 enable요청.
    if(window.klaytn.selectedAddress === undefined){
      await window.klaytn.enable();
    }
    App.currentAccount = window.klaytn.selectedAddress;
    App.connected= true;
  },
  chnaged: async function () {
    window.klaytn.on('accountsChanged', async () => {
      await App.connect();
    });
  },
  CheckId: async function () {
    document.getElementById("Account").innerHTML = "Your Kaikas Address : " + window.klaytn.selectedAddress;
  },
};

const ERC721 = {
  contract: null,
  baseURI: '',

  init: async function () {
    this.contract = new window.caver.klay.Contract(
      config.contracts.ERC721.abi,
      config.contracts.ERC721.address,
    );
  },
  pageInit: async function () {
    this.writeMaxSupply();
    scheduler(this.writeTotalSupply, 1000);
    this.baseURI = await this.getBaseURI();
  },
  getBaseURI: async function () {
    return await ERC721.contract.methods.getBaseURI().call();
  },
  getMaxSupply: async function () {
    return await ERC721.contract.methods.MAX_SUPPLY().call();
  },
  getTotalSupply: async function () {
    return await ERC721.contract.methods.totalSupply().call();
  },

  writeMaxSupply: async function () {
   document.getElementById('max-supply').innerHTML =
    await ERC721.getMaxSupply();
  },
  writeTotalSupply: async function () {
    document.getElementById('total-supply').innerHTML =
      await ERC721.getTotalSupply();
  },
};

const buyERC721 = {
  contract: null,
  init: async function () {
    this.contract = new window.caver.klay.Contract(
      config.contracts.buyERC721.abi,
      config.contracts.buyERC721.address,  
    );
    scheduler(this.writeGetPrice, 1000)
  },
  pageInit: async function () {
    scheduler(this.writeGetPrice, 1000)
  },

  getprice: async function () {
    return await buyERC721.contract.methods.getpublicSale().call();
  },

  getIsSale: async function () {
    return await buyERC721.contract.methods.isSale().call();
  },

  writeGetPrice: async function() {
    document.getElementById('get-price').innerHTML =
    await buyERC721.getprice();
  },

  mintWithETH: async function () {
    const isSale = await buyERC721.getIsSale();
    var getMyPirce = await buyERC721.getprice();
    if (!isSale) {
       alert('The sale has not started.').close(3000);
       return;
    }
    const numberOfTokens = document.getElementById('number-of-tokens').value;
    if (numberOfTokens > 5)
      return alert('only mint 5 NFT at a time').close(3000);

    const sendValue = new BigNumber(window.caver.utils.toPeb(numberOfTokens, 'KLAY'))
      .multipliedBy(getMyPirce)
      .toFixed();

    const tx = buyERC721.contract.methods.mintByETH(numberOfTokens);
    
    tx.send({
      from: window.klaytn.selectedAddress,
      //gas: estimateGas,
      gas : 1500000,
      value: caver.utils.toHex(sendValue)
    })
    .on('transactionHash', function(hash) {
      console.log("transactionHash:" + hash)
    })
    .on('receipt', function(receipt) {
      console.log("receipt:" + receipt)
    })
    .on('error', console.error);
  },
};

App.init();
