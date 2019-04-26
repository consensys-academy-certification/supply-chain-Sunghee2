const BN = web3.utils.BN
const SupplyChain = artifacts.require('SupplyChain')

contract('SupplyChain', accounts => {
    const supplyChain
    const owner = accounts[0]
    const alice = accounts[1]
    const bob = accounts[2]
    
    let itemId
    
    before("Setup contract", async () => {
        supplyChain = await SupplyChain.deployed()
    })

    it("Should add an item with the provided name and price.", async() => {
        const emptyAddress = '0x0000000000000000000000000000000000000000'
        const name = 'book'
        const price = '1000'
        const feeInWei = await web3.utils.toWei('1', 'finney')
        let eventEmitted = false
    
        const contractBalanceBefore = await web3.eth.getBalance(supplyChain.address)
        const tx = await supplyChain.addItem(name, price, {
            from: alice,
            value: feeInWei
        })
        if (tx.logs[0].event) {
            itemId = tx.logs[0].args.itemId.toString(10)
            eventEmitted = true
        } 
        const result = await supplyChain.getItem.call(itemId)
        const contractBalanceAfter = await web3.eth.getBalance(supplyChain.address)

        assert.equal(result[1], name, "The name of the last added item does not match the expected value.")
        assert.equal(result[2].toString(10), price, "The price of the last added item does not match the expected value.")
        assert.equal(result[3].toString(10), 0, "The state of the item should be 'ForSale', which should be declared first in the State enum.")
        assert.equal(result[4], alice, "The address adding the item should be listed as the seller.")
        assert.equal(result[5], emptyAddress, "The buyer address should be set to 0 when an item is added.")
        assert.equal(eventEmitted, true, "Adding an item should emit a For Sale event.")
        assert.equal(new BN(contractBalanceAfter).toString(), new BN(contractBalanceBefore).add(new BN(feeInWei)).toString(), "The contract balance should be increased by the price of the fee (1 finney).")
    })

    it("Should allow someone to purchase an item.", async() => {
        let eventEmitted = false
        const amount = '2000' 

        const aliceBalanceBefore = await web3.eth.getBalance(alice)
        const bobBalanceBefore = await web3.eth.getBalance(bob)
        const tx = await supplyChain.buyItem(itemId, {from: bob, value: amount})
        if (tx.logs[0].event) {
            itemId = tx.logs[0].args.itemId.toString(10)
            eventEmitted = true
        }
        let aliceBalanceAfter = await web3.eth.getBalance(alice)
        let bobBalanceAfter = await web3.eth.getBalance(bob)
        const result = await supplyChain.getItem.call(itemId)

        assert.equal(result[3].toString(10), 1, "The state of the item should be 'Sold', which should be declared second in the State enum.")
        assert.equal(result[5], bob, "The buyer address should be set bob when he purchases an item.")
        assert.equal(eventEmitted, true, "Adding an item should emit a Sold event.")
        assert.equal(new BN(aliceBalanceAfter).toString(), new BN(aliceBalanceBefore).add(new BN(price)).toString(), "Alice's balance should be increased by the price of the item.")
        assert.isBelow(Number(bobBalanceAfter), Number(new BN(bobBalanceBefore).sub(new BN(price))), "Bob's balance should be reduced by more than the price of the item (including gas costs).")
    })

    it("Should allow the seller to mark the item as shipped.", async() => {
        let eventEmitted = false

        const tx = await supplyChain.shipItem(itemId, {from: alice})
        if (tx.logs[0].event) {
            itemId = tx.logs[0].args.itemId.toString(10)
            eventEmitted = true
        }
        const result = await supplyChain.getItem.call(itemId)

        assert.equal(eventEmitted, true, "Adding an item should emit a Shipped event.")
        assert.equal(result[3].toString(10), 2, "The state of the item should be 'Shipped', which should be declared third in the State enum.")
    })

    it("Should allow the buyer to mark the item as received.", async() => {
        let eventEmitted = false

        const tx = await supplyChain.receiveItem(itemId, {from: bob})
        if (tx.logs[0].event) {
            itemId = tx.logs[0].args.itemId.toString(10)
            eventEmitted = true
        }
        const result = await supplyChain.getItem.call(itemId)

        assert.equal(eventEmitted, true, "Adding an item should emit a Shipped event.")
        assert.equal(result[3].toString(10), 3, "The state of the item should be 'Received', which should be declared fourth in the State enum.")
    })

});
