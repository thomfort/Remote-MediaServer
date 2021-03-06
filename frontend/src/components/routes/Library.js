/**
 * Created by owenray on 6/30/2017.
 */
import React, {Component} from 'react';
import store from '../../stores/apiStore';
import {apiActions, deserialize} from 'redux-jsonapi';
import MediaItem from "../components/mediaItem/MediaItemTile";
import { Collection, AutoSizer} from 'react-virtualized';
import SearchBar from "../components/SearchBar";

class Library extends Component {
  constructor() {
    super();
    /** @type Collection */
    this.state = {filters:{}, media:[], hasMore:false, page:0, rowCount:0};
    this.promises = [];
    this.pageSize = 25;
    this.colls = 5;
  }

  componentDidMount() {
    if(!this.state.init) {
      this.componentWillReceiveProps(this.props);
    }
  }

  componentWillReceiveProps (nextProps) {
    let filters = {};
    nextProps.location.search
      .substr(1)
      .split("&")
      .forEach(o=>{
        const parts = o.split("=");
        if(parts[0]&&parts[1]) {
          filters[parts[0]] = parts[1];
        }
      });
    this.setState({filters:filters, init:true, media:[], hasmore:true, page:0});
    this.filters = filters;
    this.promises = [];
    if(this.collection) {
      this.collection.recomputeCellSizesAndPositions();
      this.collection.forceUpdate();
    }
    this.loadMore(0,this.pageSize);
  }

  loadMore(offset, limit) {
    this.lastLoadRequest = new Date().getTime();
    this.minLoad = -1;
    this.maxLoad = 0;

    const queryParams = {page: {offset:offset, limit: limit}};
    const filters = this.filters;
    console.log("load with", filters);
    for (let key in filters) {
      if(filters[key]) {
        queryParams[key] = filters[key];
      }
    }

    if (queryParams.title) {
      queryParams.title = "%" + queryParams.title + "%";
    }

    if (this.state.libraries) {
      queryParams.libraries = this.state.libraries;
    }

    queryParams.distinct = "external-id";
    queryParams.join = "play-position";
    queryParams.extra = false;

    store.dispatch(apiActions.read(
      {_type: 'media-items'},
      {"params": queryParams}
    )).then((res) => {
      const i = res.resources;
      const items = this.state.media;
      const firstTime = !items.length;


      for (let key in i) {
        const index = parseInt(offset+parseInt(key, 10), 10);
        const o = deserialize(i[key], store);
        items[index] = o;
        if(this.promises[index]) {
          this.promises[index](o);
          delete this.promises[index];
        }
      }
      for(let c = 0; c<res.meta.totalItems; c++) {
        if(!items[c]) {
          items[c] = {index: c};
        }
      }
      if(firstTime) {
        this.setState({
          media:items,
          rowCount:res.meta.totalItems
        });
      }
    });
  }

  requestData(index) {
    let r;
    const promise = new Promise(resolve => r=resolve);
    if(!this.state.media[index].index) {
      r(this.state.media[index]);
      return promise;
    }
    if(index<this.minLoad||this.minLoad===-1) {
      this.minLoad = index;
    }
    if(index>this.maxLoad) {
      this.maxLoad = index;
    }
    if(this.requestDataTimeout) {
      clearTimeout(this.requestDataTimeout);
    }
    if(new Date().getTime()-this.lastLoadRequest>600) {
      this.doRequestData();
    }else {
      this.requestDataTimeout = setTimeout(this.doRequestData.bind(this), 1000);
    }

    this.promises[index] = r;
    return promise;
  }

  doRequestData() {
    this.minLoad-=this.pageSize;
    this.maxLoad+=this.pageSize;
    /* Not sure why I did this:
    while(!this.state.media[this.minLoad]||!this.state.media[this.minLoad].index) {
      console.log(this.minLoad);
      this.minLoad++;
    }
    while(!this.state.media[this.maxLoad]||!this.state.media[this.maxLoad].index) {
      this.maxLoad--;
    }*/
    const count = this.maxLoad-this.minLoad;
    this.loadMore(this.minLoad, count<this.pageSize?this.pageSize:count);
  }

  onResize({width}) {
    if(this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(()=>{
      this.colls = Math.floor(width/165);
      if(this.collection)
        this.collection.recomputeCellSizesAndPositions();
      this.forceUpdate();
    }, 300);
  }

  cellSizeAndPositionGetter ({ index }) {
    return {
      height: 236,
      width: 150,
      x: index%this.colls*165,
      y: Math.floor(index/this.colls)*251+65
    }
  }

  cellRenderer({ index, key, style }) {
    return <MediaItem
      key={key}
      style={style}
      mediaItem={this.state.media[index]}
      requestData={this.requestData.bind(this)} />
  }

  onChange(o) {
    this.setState({filters:o});
    let url = "";
    for (let key in this.state.filters) {
      url += key + "=" + this.state.filters[key] + "&";
    }
    this.props.history.push("?" + url);
  }

  render() {
    let collection = <div>Loading</div>;

    if(this.state.media.length) {
      collection = <AutoSizer onResize={this.onResize.bind(this)}>
        {({width, height}) =>
          <Collection
            ref={ref => this.collection = ref}
            cellCount={this.state.rowCount}
            cellRenderer={this.cellRenderer.bind(this)}
            cellSizeAndPositionGetter={this.cellSizeAndPositionGetter.bind(this)}
            width={width}
            verticalOverscanSize={20}
            height={height}>
          </Collection>}
      </AutoSizer>
    }

    return (
      <div>
        <div className="impagewrapper">
          <SearchBar filters={this.state.filters} scroller={this.collection} onChange={this.onChange.bind(this)}/>
          {collection}
        </div>
      </div>
    );
  }
}

export default Library;
