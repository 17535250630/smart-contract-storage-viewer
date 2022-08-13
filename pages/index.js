import Head from 'next/head'
import styles from '../styles/Home.module.css'
import HexEditor from 'react-hex-editor';
import React from 'react';
import EthRPC from '../lib/apiclient';

import analyzeStorage from '../lib/decoder';

import dynamic from 'next/dynamic'

const DynamicReactJson = dynamic(import('react-json-view'), { ssr: false })

class HexViewWithForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      endpoint: "https://ropsten.infura.io/v3/798abb58ef824315ae09ce39beb1c329",
      startslot: "0x0",
      numslots: 10,
      target: "0x3a6CAE3af284C82934174F693151842Bc71b02b2",
      atBlock: "latest",
      data: new Array(),
      nonce: 0,
      dirty: true,
      error: undefined,
      api: new EthRPC()
    };
  }


  shouldComponentUpdate() {
    return true;
  }

  shouldUpdateView() {
    return this.state.dirty && this.state.endpoint.length && this.state.numslots != 0 && this.state.target.length == 42;
  }

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {

    if (!this.shouldUpdateView()) {
      console.log("no update")
      return;
    }
    console.log("updated")


    function hexStringToByteArray(hexString) {
      if (hexString.length % 2 !== 0) {
        return [];
      }/* w w w.  jav  a2 s .  c o  m*/
      var numBytes = hexString.length / 2;
      var byteArray = new Array(numBytes);
      for (var i = 0; i < numBytes; i++) {
        byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
      }
      return byteArray;
    }

    if (this.state.dirty) {
      this.setState({ dirty: false });
      let atblock = isNaN(parseInt(this.state.atBlock)) ? "latest" : `0x${this.state.atBlock.toString(16)}`;
      //fetch data
      this.state.api.setEndpoint(this.state.endpoint);
      this.state.api.getStorageAt(this.state.target, this.state.startslot, this.state.numslots, atblock).then(arr => {
        if (arr && arr.length > 0 && arr[0].error) {
          throw new Error(arr[0].error.message);
        }
        let flatData = arr.map(a => a.result).reduce((flat, toFlatten) => flat.concat(hexStringToByteArray(toFlatten.replace("0x", ""))), []);
        this.setState({
          data: flatData,
          nonce: this.state.nonce + 1, //force render
          error: undefined
        });
      }).catch(err => {
        let errMsg;
        if (err instanceof TypeError) {
          errMsg = "Invalid Input";
        } else if (err.message) {
          errMsg = err.message;
        } else if (err.readyState != undefined) {
          errMsg = "Error querying API endpoint (infura?)"
        } else {
          errMsg = err.responseJSON.error.message;
          if (errMsg.substr("rate limited")) {
            errMsg += ". Check your infura API limitations or change API-key."
          }
        }


        this.setState({ error: errMsg })
      });
    }
  }

  render() {

    function handleSetValue(offset, value) {
      //this.setState({data[offset] = value;
      //this.state.nonce += 1;
      console.log(offset, value)
    }

    let chainPrefix = this.state.endpoint.match(/https?:\/\/(.*).infura.io.*/);
    if (chainPrefix && chainPrefix.length >= 2) {
      chainPrefix = chainPrefix[1].toLowerCase().trim();
    } else {
      chainPrefix = "";
    }

    let storageAnalysis = analyzeStorage(this.state);

    return (
      <div>
        <div>
          <form>
            <table>
              <thead>
                <tr>
                  <th>📝 Target</th>
                  <th>First Slot</th>
                  <th># Slots</th>
                  <th>at Block</th>
                  <th>API-Endpoint</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <input type="text" name="target"
                      size={50}
                      pattern="0x[0-9a-FA-F]{40}" title="Target must be an Ethereum Address starting with 0x..."
                      value={this.state.target}
                      onChange={(e) => this.setState({ target: e.target.value.trim(), dirty: true })} />
                  </td>
                  <td>
                    <input type="text" name="startslot"
                      size={15}
                      pattern="[0-9]+" title="Field must be a Number."
                      value={this.state.startslot}
                      onChange={(e) => this.setState({ startslot: e.target.value.trim(), dirty: true })}
                    />
                  </td>
                  <td>
                    <input type="text" name="numslots"
                      size={15}
                      pattern="[0-9]+" title="Field must be a Number."
                      value={this.state.numslots}
                      onChange={(e) => this.setState({ numslots: parseInt(e.target.value.trim()), dirty: true })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="atBlock"
                      pattern="https?://.*" title="Field must be a HTTP(s)-URL."
                      size={10}
                      value={this.state.atBlock}
                      onChange={(e) => this.setState({ atBlock: e.target.value.trim(), dirty: true })}
                    />
                  </td>
                  <td>
                    <div title="Get Api Key">
                      <input
                        type="text"
                        name="endpoint"
                        pattern="https?://.*" title="Field must be a HTTP(s)-URL."
                        size={70}
                        value={this.state.endpoint}
                        onChange={(e) => this.setState({ endpoint: e.target.value.trim(), dirty: true })}
                      />
                      &nbsp;
                      <a href="https://infura.io/register">ⓘ</a>
                    </div>

                  </td>
                  <td>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>
        <div>
          <div>
            <a href={`https://${chainPrefix != 'mainnet' ? `${chainPrefix}.` : ''}etherscan.io/address/${this.state.target}`}>🌐 Etherscan</a>
            {/*   &nbsp;<a href={`https://dashboard.tenderly.co/contract/${chainPrefix}/${this.state.target}`}>🟣 Tenderly</a> */}
          </div>
          <div className='errorBox'>
            {this.state.error ? `❗ ${this.state.error}` : ""}
          </div>
          <HexEditor
            className="hexview"
            columns={0x20}
            height={600}
            data={this.state.data}
            nonce={this.state.nonce}
            showAscii={true}
            showColumnLabels={true}
            showRowLabels={true}
            highlightColumn={true}
            onSetValue={handleSetValue}
            readOnly={true}
            theme={{}}
          />
        </div>
        <div className="mt-2 flex">
          <div className="flex items-center text-sm text-gray-500">
            <DynamicReactJson
              name={false}
              collapsed={false}
              displayDataTypes={false}
              src={
                Object.keys(storageAnalysis).reduce((result, key) => {
                  result[key] = storageAnalysis[key].guess;
                  return result;
                }, {})
              }
              onSelect={
                (select) => {
                  switch (select.name) {
                    case 'address':
                      window.open(`https://${chainPrefix && chainPrefix != 'mainnet' ? `${chainPrefix}.` : ""}etherscan.io/address/${select.value}`, '_blank');
                      break;
                  }
                }
              }
            />
          </div>
        </div>
      </div>
    );
  }
}



export default function Home() {

  return (
    <div className={styles.container}>
      <Head>
        <title>Smart Contract Storage Viewer</title>
        <meta name="description" content="Ethereum Smart Contract Storage Hex Viewer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HexViewWithForm />
      <hr></hr>
      <sub><a href="https://github.com/tintinweb">@tintinweb ❤️</a> <a href="https://github.com/tintinweb/smart-contract-storage-viewer">smart-contract-storage-viewer</a></sub>
    </div>

  )
}
