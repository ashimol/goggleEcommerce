const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Offer = require("../../models/offerSchema")

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp")


const Excel = require('exceljs');
const PDFDocument = require('pdfkit');


const getSalesReport = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const stats = await calculateStats(startOfDay, endOfDay);
        
        res.render("sales-report", {
            ...stats,
            dateRange: 'daily',
            startDate: startOfDay,
            endDate: endOfDay,
            orderDetails: stats.orderDetails,
        });
    } catch (error) {
        console.error("Error in getSalesReport:", error);
        res.status(500).redirect("/admin/pageerror");
    }
};

const filterSalesReport = async (req, res) => {
    try {
        const { dateFilter, startDate, endDate } = req.body;
        const today = new Date();
        let start, end;

        switch (dateFilter) {
            case 'daily':
                start = new Date(today.setHours(0, 0, 0, 0));
                end = new Date(today.setHours(23, 59, 59, 999));
                break;
            case 'weekly':
                start = new Date(today.setDate(today.getDate() - 7));
                end = new Date(new Date().setHours(23, 59, 59, 999));
                break;
            case 'monthly':
                start = new Date(today.setMonth(today.getMonth() - 1));
                end = new Date(new Date().setHours(23, 59, 59, 999));
                break;
            case 'yearly':
                start = new Date(today.setFullYear(today.getFullYear() - 1));
                end = new Date(new Date().setHours(23, 59, 59, 999));
                break;
            case 'custom':
                if (!startDate || !endDate) {
                    throw new Error("Start and end dates are required for custom range");
                }
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                break;
            default:
                throw new Error("Invalid date filter");
        }

        const stats = await calculateStats(start, end);
        
        res.render("sales-report", {
            ...stats,
            dateRange: dateFilter,
            startDate: start,
            endDate: end
        });
    } catch (error) {
        console.error("Error in filterSalesReport:", error);
        res.status(400).render("sales-report", {
            error: error.message,
            totalOrders: 0,
            totalSales: 0,
            totalDiscount: 0,
            totalActualPrice: 0,
            totalOfferPrice: 0,
            dateRange: 'daily'
        });
    }
};

const calculateStats = async (startDate, endDate) => {

    const orders = await Order.find({
      orderDate: { 
            $gte: startDate, 
            $lte: endDate 
        }
    })
    .populate('userId') 
    .populate('items.productId');

    
     const totalOrders = orders.reduce((total, order) => {
          const validItems = order.items.filter(item => 
            item.itemOrderStatus !== "Cancelled" && 
            item.itemOrderStatus !== "Returned"
        );
        return total + validItems.length;
    }, 0);


//     const totalSales = orders.reduce((sum, order) => {
//       const validItemsTotal = order.items.reduce((itemSum, item) => {
//           if (item.itemOrderStatus !== "Cancelled" && item.itemOrderStatus !== "Returned") {
//               return itemSum + (item.price * item.quantity);
//           }
//           return itemSum;
//       }, 0);
//       return sum + validItemsTotal;
//   }, 0);

        const totalSales = orders.reduce((sum,order) =>{
            return sum + order.totalAmount;
        },0);


    const cancelledOrders = orders.filter(order =>
        order.items.some(item => item.itemOrderStatus === "Cancelled")
    ).length;
      
    const returnedOrders = orders.filter(order =>
          order.items.some(item => item.itemOrderStatus === "Returned")
      ).length;

    const completedOrders = orders.filter(order => 
        order.payment.some(payment => payment.status === "completed") &&
        order.items.some(item => 
            item.itemOrderStatus !== "Cancelled" && 
            item.itemOrderStatus !== "Returned"
        )
    ).length;

    const ordersWithCoupon = orders.filter(order => order.coupon).length;

   

    // const detailedStats = calculateOrderStats(orders);

    return { 
      totalOrders,
      completedOrders,
      cancelledOrders,
      returnedOrders,
      ordersWithCoupon,
      totalSales,
      orderDetails: orders, 
    };
};




const downloadReport = async (req, res) => {
    try {
        const { format, dateFilter, startDate, endDate } = req.body;
        const today = new Date();
        let start, end;

        switch (dateFilter) {
            case 'daily':
                start = new Date(today.setHours(0, 0, 0, 0));
                end = new Date(today.setHours(23, 59, 59, 999));
                break;
            case 'weekly':
                start = new Date(today.setDate(today.getDate() - 7));
                end = new Date(new Date().setHours(23, 59, 59, 999));
                break;
            case 'monthly':
                start = new Date(today.setMonth(today.getMonth() - 1));
                end = new Date(new Date().setHours(23, 59, 59, 999));
                break;
            case 'yearly':
                start = new Date(today.setFullYear(today.getFullYear() - 1));
                end = new Date(new Date().setHours(23, 59, 59, 999));
                break;
            case 'custom':
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                break;
            default:
                throw new Error("Invalid date filter");
        }

        
        const completedOrders = await fetchCompletedOrdersWithItems(start, end);

        if (format === 'excel') {
            await generateExcel(res, completedOrders, dateFilter, start, end);
        } else if (format === 'pdf') {
            await generatePDF(res, completedOrders, dateFilter, start, end);
        } else {
            throw new Error("Invalid format specified");
        }

    } catch (error) {
        console.error("Error in downloadReport:", error);
        res.status(500).send("Error generating report");
    }
};

const fetchCompletedOrdersWithItems = async (startDate, endDate) => {
  const orders = await Order.find({
      orderDate: { 
          $gte: startDate, 
          $lte: endDate 
      },
      'payment.status': 'completed'  
  }).populate('items.productId'); 

  return orders.map(order => ({
      orderId: order.orderId, 
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      items: order.items.map(item => ({
          productName: item.productId?.productName || 'Deleted Product',
          description: item.productId?.description || 'N/A',
          color: item.productId?.color || 'N/A',
          regularPrice: item.productId?.regularPrice || 0,
          salePrice: item.productId?.salePrice || 0,
          quantity: item.quantity,
          itemOrderStatus: item.itemOrderStatus,
          itemOrderId: item.itemOrderId,
          actualPrice: item.price, 
      })),
  }));
};

const generateExcel = async (res, orders, dateFilter, startDate, endDate) => {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  const stats = await calculateStats(startDate, endDate);

  // Add header information
  worksheet.addRow(['Date Range:', `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`]);
  worksheet.addRow(['']);
  
  // Add summary section
  worksheet.addRow(['Sales Summary']);
  worksheet.addRow(['Total Orders', stats.totalOrders]);
  worksheet.addRow(['Payment Completed', stats.completedOrders]);
  worksheet.addRow(['Cancelled Orders', stats.cancelledOrders]);
  worksheet.addRow(['Returned Orders', stats.returnedOrders]);
  worksheet.addRow(['Total Coupon Applied', stats.ordersWithCoupon]);
  worksheet.addRow(['']);

  // Add detailed report headers
  worksheet.addRow(['Sales Report (Payment Completed)']);
  worksheet.addRow(['']);
  worksheet.addRow([ 
      'SI', 'Order ID', 'Date', 'Product', 'SKU', 'Color', 
      'Regular Price', 'Sale Price', 'Quantity', 'Order Status', 
      'Discount', 'Net Price'
  ]);

  let si = 1;
  let totalRegularPrice = 0;
  let totalSalePrice = 0;
  let totalQuantity = 0;
  let totalDiscount = 0;
  let totalNetPrice = 0;
  let totalReturnedAmount = 0;

  orders.forEach(order => {
      order.items.forEach(item => {
          const regularPrice = item.regularPrice * item.quantity;
          const salePrice = item.actualPrice * item.quantity; // Using actual price from order
          const discount = (item.regularPrice - item.actualPrice) * item.quantity;
          const netPrice = salePrice;

          worksheet.addRow([ 
              si++, 
              item.itemOrderId,
              order.orderDate.toLocaleString(),
              item.productName,
              item.color,
              regularPrice.toFixed(2), 
              salePrice.toFixed(2),   
              item.quantity,
              item.itemOrderStatus,
              discount.toFixed(2),     
              netPrice.toFixed(2)     
          ]);

          totalRegularPrice += regularPrice;
          totalSalePrice += salePrice;
          totalQuantity += item.quantity;
          totalDiscount += discount;
          totalNetPrice += netPrice;

          if (item.itemOrderStatus === "Returned") {
              totalReturnedAmount += netPrice;
          }
      });
  });

  // Add totals
  worksheet.addRow(['']);
  worksheet.addRow(['', '', '', '', '', 'Returned Total', '', '', '', '', '', 
      totalReturnedAmount.toFixed(2)
  ]);

  worksheet.addRow([ 
      '', '', '', '', '', 'NET TOTAL', 
      totalRegularPrice.toFixed(2),
      totalSalePrice.toFixed(2),
      totalQuantity,
      '',
      totalDiscount.toFixed(2),
      (totalNetPrice - totalReturnedAmount).toFixed(2)
  ]);

  // Set column widths
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 30;
  worksheet.getColumn(5).width = 15;
  worksheet.getColumn(6).width = 10;
  worksheet.getColumn(7).width = 15;
  worksheet.getColumn(8).width = 15;
  worksheet.getColumn(9).width = 10;
  worksheet.getColumn(10).width = 15;
  worksheet.getColumn(11).width = 15;
  worksheet.getColumn(12).width = 15;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=sales-report-${dateFilter}.xlsx`);

  await workbook.xlsx.write(res);
};

const generatePDF = async (res, orders, dateFilter, startDate, endDate) => {
  const doc = new PDFDocument({ margin: 10, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=sales-report-${dateFilter}.pdf`);

  doc.pipe(res);

  const itemsPerPage = 7;
  let currentPage = 1;
  let itemsOnCurrentPage = 0;
  let fixedY = 230;

  const stats = await calculateStats(startDate, endDate);

  // Helper function to add header to each page
  const addHeader = (includeSummary = false) => {
      doc.fontSize(16).text('Sales Report', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      if (includeSummary) {
          doc.fontSize(12).text('Sales Summary');
          doc.moveDown();
          doc.fontSize(10)
              .text(`Total Orders: ${stats.totalOrders}`)
              .text(`Payment Completed: ${stats.completedOrders}`)
              .text(`Cancelled Orders: ${stats.cancelledOrders}`)
              .text(`Returned Orders: ${stats.returnedOrders}`)
              .text(`Total Coupon Applied: ${stats.ordersWithCoupon}`);
          doc.moveDown();
      }

      // Add table headers
      doc.fontSize(10);
      doc.text('SI', 30, 200, { continued: false, width: 10 });
      doc.text('Order ID', 60, 200, { continued: false, width: 60 });
      doc.text('Date', 140, 200, { continued: false, width: 60 });
      doc.text('Product', 220, 200, { continued: false, width: 60 });
      doc.text('Color', 380, 200, { continued: false, width: 60 });
      doc.text('Regular Price', 430, 200, { continued: false, width: 60 });
      doc.text('Sale Price', 500, 200, { continued: false, width: 60 });
      doc.text('Quantity', 570, 200, { continued: false, width: 60 });
      doc.text('Order Status', 620, 200, { continued: false, width: 60 });
      doc.text('Discount', 690, 200, { continued: false, width: 60 });
      doc.text('Net Price', 750, 200, { width: 60 });
  };

  // Add first page header with summary
  addHeader(true);

  let si = 1;
  let grandTotalRegularPrice = 0;
  let grandTotalSalePrice = 0;
  let grandTotalQuantity = 0;
  let grandTotalDiscount = 0;
  let grandTotalNetPrice = 0;
  let grandTotalReturnedAmount = 0;

  orders.forEach((order, orderIndex) => {
      order.items.forEach((item, itemIndex) => {
          if (itemsOnCurrentPage === itemsPerPage) {
              doc.addPage();
              currentPage++;
              itemsOnCurrentPage = 0;
              fixedY = 80;
              addHeader();
          }

          const regularPrice = item.regularPrice * item.quantity;
          const salePrice = item.actualPrice * item.quantity;
          const discount = (item.regularPrice - item.actualPrice) * item.quantity;
          //const discount = salePrice -order.totalAmount ;
          const netPrice = order.totalAmount;

          // Add row data
          doc.fontSize(8)
              .text(si++, 30, fixedY, { continued: false, width: 10 })
              .text(item.itemOrderId, 60, fixedY, { continued: false, width: 60 })
              .text(order.orderDate.toLocaleString(), 140, fixedY, { continued: false, width: 60 })
              .text(item.productName, 220, fixedY, { continued: false, width: 60 })
              .text(item.color, 380, fixedY, { continued: false, width: 60 })
              .text(regularPrice.toFixed(2), 430, fixedY, { continued: false, width: 60 })
              .text(salePrice.toFixed(2), 500, fixedY, { continued: false, width: 60 })
              .text(item.quantity.toString(), 570, fixedY, { continued: false, width: 60 })
              .text(item.itemOrderStatus, 620, fixedY, { continued: false, width: 60 })
              .text(discount.toFixed(2), 690, fixedY, { continued: false, width: 60 })
              .text(netPrice.toFixed(2), 750, fixedY, { width: 60 });

          // Update totals
          grandTotalRegularPrice += regularPrice;
          grandTotalSalePrice += salePrice;
          grandTotalQuantity += item.quantity;
          grandTotalDiscount += discount;
          grandTotalNetPrice += netPrice;

          if (item.itemOrderStatus === "Returned") {
              grandTotalReturnedAmount += netPrice;
          }

          itemsOnCurrentPage++;
          fixedY += 50;

          // Add final totals on last page
          if (orderIndex === orders.length - 1 && itemIndex === order.items.length - 1) {
              doc.fontSize(8).text("Returned Total:", 320, fixedY, { continued: false, width: 60 });
              doc.text(grandTotalReturnedAmount.toFixed(2), 750, fixedY, { continued: false, width: 60 });
              doc.moveDown();

              doc.fontSize(12).text('Net Total:', 320, fixedY += 50, { continued: false });
              doc.text(grandTotalRegularPrice.toFixed(2), 430, fixedY, { continued: false, width: 60 });
              doc.text(grandTotalSalePrice.toFixed(2), 500, fixedY, { continued: false, width: 60 });
              doc.text(grandTotalQuantity.toString(), 570, fixedY, { continued: false, width: 60 });
              doc.text(grandTotalDiscount.toFixed(2), 690, fixedY, { continued: false, width: 60 });
              doc.text((grandTotalNetPrice - grandTotalReturnedAmount).toFixed(2), 750, fixedY, { width: 60 });
          }
      });
  });

  doc.end();
};


module.exports = {
    getSalesReport,
    filterSalesReport,
    downloadReport
};