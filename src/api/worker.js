import wepy from 'wepy';
import Page from '../utils/Page';
import base from './base'
import {TYPE, ACTION, orderUtils as utils} from './order_const';
export default class work extends base{
  static page(){
      const url = `http://localhost/api/worker`;
      return new Page(url, this._processOrderListItem.bind(this));
  }

  async static detail(workerId){
    const url = `http://localhost/api/worker/${workerId}`;
    const data = await this.get(url);
    return this._processOrderDetail(data);
  }

  /**
   * 处理订单列表数据
   */
  static _processOrderListItem(order) {}

  /**
   * 处理订单详情
   */
  static _processOrderDetail(detail) {
    // 支付方式
    detail.shopName = this.shopName;
    // 处理订单支付方式
    this._processOrderPaymentText(detail);
    // 处理订单状态
    this._processOrderStatusDesc(detail);
    // 处理退款信息
    this._processOrderRefund(detail);
    // 处理物流信息
    this._processOrderTrace(detail);
    // 处理订单配送方式
    this._processOrderDetailDelivery(detail);
    // 处理订单价格
    this._processOrderPrice(detail);
    // 处理地址信息
    this._processOrderAddress(detail);
    // 处理商品信息
    this._processOrderGoods(detail.orderGoodsInfos);
    // 处理动作
    this._processOrderAction(detail, true);
    // 处理离线支付
    this._processOfflinePayment(detail);
    return detail;
  }

  static _processOfflinePayment(order) {
    const orderType = order.orderType;
    if (orderType != TYPE.OFFLINE) return;
    order.orderGoodsInfos = [{
      imageUrl: 'http://img.leshare.shop/shop/other/wechat_pay.png',
      goodsName: `微信支付 ${order.finalPrice}元`,
      goodsPrice: order.finalPrice,
      count: 1
    }];
    return order;
  }

  /**
   * 处理订单动作
   */
  static _processOrderAction(order, inner = false) {
    const basic = [ACTION.REMARK];
    if (inner) {
      basic.push(ACTION.PRINT);
    }
    const {orderType, paymentType, status} = order;
    const actions = utils.statusActions(orderType, paymentType, status);
    if (actions) {
      const display = inner ? actions.filter(v => v.inner != true) : actions;
      order.actions = basic.concat(display);
    } else {
      order.actions = basic;
    }
  }

  /**
   * 处理地址信息
   */
  static _processOrderAddress(detail) {
    detail.receiveAddress = {
      fullAddress: detail.address,
      name: detail.receiveName,
      phone: detail.receivePhone
    }
  }

  /**
   * 处理订单支付方式
   */
  static _processOrderPaymentText (detail) {
    detail.paymentText = utils.paymentType(detail.paymentType);
  }


  /**
   * 处理状态描述文本
   */
  static _processOrderStatusDesc (order) {
    const {status, orderType} = order;
    order.statusText = utils.statusName(orderType, status);
    order.statusDesc = utils.statusDesc(order, status);
    // 订单关闭增加关闭原因
    if (order.status == 7 && order.orderCloseNote) {
      const reason = order.orderCloseNote;
      order.statusDesc = `订单已关闭，关闭原因：${reason.note}`;
    }
  }

  /**
   * 处理物流配送信息
   */
  static _processOrderDetailDelivery (order) {
    order.deliveryText = utils.deliveryType(order.deliveryType);
  }
  /**
   * 处理订单状态
   */
  static _processOrderPrice(order) {
    order.postFee = this._fixedPrice(order.postFee);
    order.dealPrice = this._fixedPrice(order.dealPrice);
    order.finalPrice = this._fixedPrice(order.finalPrice);
    order.couponPrice = this._fixedPrice(order.couponPrice);
    order.bonusPrice = this._fixedPrice(order.bonusPrice);
  }

  /**
   * 处理商品物流信息
   */
  static _processOrderTrace(order) {
    const express = order.orderExpress;
    if (express == null) {
      // 没有物流信息，不做处理
      return;
    }

    // 有物流，就一定需要展现动作列表
    order.isAction = true;
    order.isExpress = true;
  }

  /**
   * 处理订单的退货信息
   */
  static _processOrderRefund(order) {
    const refunds = order.orderRefunds;
    if (refunds == null || refunds.length < 1) {
      // 订单没有退款信息，不做处理
      return;
    }
    // 展现第一个退款记录
    const refund = refunds[refunds.length - 1];
    // 曾经退款过，就一定需要展现退款记录
    order.isAction = true;
    // 控制展现退款详情字段
    order.isRefund = true;
    // 取出第一条退款记录
    order.curRefund = refund;
  }

  /**
   * 处理订单商品信息
   */
  static _processOrderGoods(goods) {
    if (goods == null || goods.length < 1) {
      return;
    }
    goods.forEach(item => {
      // 处理SKU描述
      const sku = item.goodsSku;
      item.skuText = this._processOrderSku(sku);
      item.imageUrl += '/small';
    });
  }

  /**
   * 处理SKU的默认值
   */
  static _processOrderSku(goodsSku) {
    let skuText = '';
    if (goodsSku && goodsSku != '') {
      skuText = goodsSku.replace(/:/g, ',');
    }
    return skuText;
  }
  static _fixedPrice(price) {
    if (price == null || isNaN(Number(price))) {
      return null;
    }
    return price.toFixed(2);
  }

}